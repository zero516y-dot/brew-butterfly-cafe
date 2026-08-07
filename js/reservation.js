
(function () {
  'use strict';

  var BACKEND_URL = window.getBrewButterflyBackendUrl
    ? window.getBrewButterflyBackendUrl('https://brew-butterfly-cafe-1.onrender.com')
    : 'https://brew-butterfly-cafe-1.onrender.com';
  var csrfToken = null;
  var csrfPromise = null;

  function safe(value) {
    return String(value == null ? '' : value)
      .replace(/[<>&"]/g, function (c) {
        return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]);
      });
  }

  function showToast(message, type) {
    var container = document.getElementById('bbc-toast-stack');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bbc-toast-stack';
      container.style.cssText =
        'position:fixed;bottom:26px;right:26px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:min(360px,calc(100vw - 40px));pointer-events:none;';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    var isError = type === 'error';
    var accent = isError ? '#ef4444' : '#10b981';
    toast.style.cssText =
      'pointer-events:auto;display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:14px;' +
      'background:rgba(23,21,20,0.92);color:#fff;font-size:14px;line-height:1.45;font-weight:500;' +
      'box-shadow:0 12px 34px rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.08);' +
      'border-left:3px solid ' + accent + ';' +
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'transform:translateY(16px);opacity:0;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s ease;';

    var dot = document.createElement('span');
    dot.style.cssText =
      'flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:' + accent + ';box-shadow:0 0 0 3px ' + accent + '33;';
    var text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(dot);
    toast.appendChild(text);
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.style.transform = 'translateY(16px)';
      toast.style.opacity = '0';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 380);
    }, 4200);
  }

  async function fetchCsrfToken(force) {
    if (csrfPromise && !force) return csrfPromise;
    csrfPromise = fetch(BACKEND_URL + '/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }).then(async function (response) {
      var body = {};
      try { body = await response.json(); } catch (_) {}
      if (!response.ok || !body.csrfToken) {
        throw new Error(body.error || 'Could not obtain security token.');
      }
      csrfToken = body.csrfToken;
      return csrfToken;
    }).catch(function (err) {
      csrfToken = null;
      throw err;
    }).finally(function () {
      csrfPromise = null;
    });
    return csrfPromise;
  }

  async function submitReservation(data) {
    if (!csrfToken) {
      try {
        await fetchCsrfToken(false);
      } catch (err) {
        throw new Error('The reservation service is currently unavailable. Please try again later.');
      }
    }

    var response = await fetch(BACKEND_URL + '/api/reserve', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(data)
    });

    var body = {};
    try { body = await response.json(); } catch (_) {}

    if (response.status === 403) {
      try {
        await fetchCsrfToken(true);
        return submitReservation(data);
      } catch (err) {
        throw new Error('The reservation service is currently unavailable. Please try again later.');
      }
    }

    if (!response.ok) {
      throw new Error(body.error || 'Reservation failed. Please try again.');
    }

    return body;
  }

  function buildConfirmHTML(data, id) {
    return '<div><span>Reference:</span> <strong>' + safe(id) + '</strong></div>' +
      '<div><span>Name:</span> <strong>' + safe(data.name) + '</strong></div>' +
      '<div><span>Date &amp; Time:</span> <strong>' + safe(data.date) + ' at ' + safe(data.time) + '</strong></div>' +
      '<div><span>Guests:</span> <strong>' + safe(data.guests) + ' Persons</strong></div>' +
      (data.occasion ? '<div><span>Occasion:</span> <strong>' + safe(data.occasion) + '</strong></div>' : '') +
      (data.notes ? '<div><span>Notes:</span> <strong>' + safe(data.notes) + '</strong></div>' : '');
  }

  function wireForm() {
    var form = document.getElementById('reservation-form');
    if (!form || form.dataset.wired === '1') return;
    form.dataset.wired = '1';

    var guestCount = document.getElementById('guest-count');
    var minus = document.getElementById('guest-minus');
    var plus = document.getElementById('guest-plus');
    var newReservation = document.getElementById('new-reservation');
    var formStage = document.getElementById('form-stage');
    var confirmPanel = document.getElementById('confirm-panel');
    var confirmRef = document.getElementById('confirm-ref');
    var confirmDetails = document.getElementById('confirm-details');
    var submitButton = form.querySelector('button[type="submit"]');

    function setGuests(value) {
      value = Math.max(1, Math.min(50, Number(value) || 2));
      guestCount.textContent = String(value);
    }
    if (minus) minus.addEventListener('click', function () { setGuests(Number(guestCount.textContent) - 1); });
    if (plus) plus.addEventListener('click', function () { setGuests(Number(guestCount.textContent) + 1); });

    var dateInput = document.getElementById('r-date');
    if (dateInput) {
      var now = new Date();
      var yyyy = now.getFullYear();
      var mm = String(now.getMonth() + 1).padStart(2, '0');
      var dd = String(now.getDate()).padStart(2, '0');
      dateInput.min = yyyy + '-' + mm + '-' + dd;
    }

    fetchCsrfToken(false).catch(function (err) {
      console.warn('[Reservation] Backend connection not ready:', err.message);
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var data = {
        name: document.getElementById('r-name').value.trim(),
        phone: document.getElementById('r-phone').value.trim(),
        guests: Number(guestCount.textContent) || 2,
        date: document.getElementById('r-date').value,
        time: document.getElementById('r-time').value,
        occasion: document.getElementById('r-occasion').value,
        notes: document.getElementById('r-notes').value.trim()
      };

      if (!data.name || !data.phone || !data.date || !data.time) {
        showToast('Please complete all required fields.', 'error');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      try {
        var result = await submitReservation(data);
        if (formStage) formStage.style.display = 'none';
        if (confirmPanel) confirmPanel.style.display = 'block';
        if (confirmRef) confirmRef.textContent = result.reservationId || '';
        if (confirmDetails) confirmDetails.innerHTML = buildConfirmHTML(data, result.reservationId);
        var successMessage = result && result.emailSent === false
          ? 'Reservation saved successfully. The email notification could not be sent. Please contact the cafe if you need confirmation.'
          : 'Reservation received successfully.';
        showToast(successMessage, result && result.emailSent === false ? 'error' : undefined);
      } catch (err) {
        console.error('[Reservation] FAILED:', err);
        showToast(err.message || 'Could not save reservation. Please try again.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Reservation';
      }
    });

    if (newReservation) {
      newReservation.addEventListener('click', function () {
        form.reset();
        setGuests(2);
        if (confirmPanel) confirmPanel.style.display = 'none';
        if (formStage) formStage.style.display = 'block';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', wireForm);
})();
