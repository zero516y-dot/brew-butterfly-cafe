/* ==========================================================================
   BREW BUTTERFLY CAFE — RESERVATION MODULE
   Replaces the Web3Forms client-side email with a real backend API call.
   Handles CSRF token fetch, form validation, submission, and UI feedback.
   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL = 'https://brew-butterfly-cafe-1.onrender.com';
  var csrfToken   = null;

  /* ---------- CSRF Token ---------- */
  function fetchCsrfToken() {
    return fetch(BACKEND_URL + '/api/csrf-token', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) { csrfToken = d.csrfToken; return d.csrfToken; })
      .catch(function () {
        // Backend may be offline — degrade gracefully
        console.warn('[Reservation] Backend offline — CSRF token unavailable.');
        csrfToken = null;
      });
  }

  /* ---------- Sanitize helper ---------- */
  function safe(str) {
    return String(str || '').trim().replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }

  /* ---------- Toast helper ---------- */
  function showToast(msg, type) {
    var toast = document.getElementById('toast');
    var text  = document.getElementById('toast-text');
    if (!toast || !text) return;
    text.textContent = msg;
    toast.className = 'toast show' + (type === 'error' ? ' toast-error' : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('show'); }, 4000);
  }

  /* ---------- Submit reservation to backend ---------- */
  function submitReservation(data) {
    return fetch(BACKEND_URL + '/api/reserve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Reservation failed');
        return body;
      });
    });
  }

  /* ---------- Build confirmation HTML ---------- */
  function buildConfirmHTML(data, reservationId) {
    return '<div><span>Name:</span> <strong>' + safe(data.name) + '</strong></div>' +
      '<div><span>Date &amp; Time:</span> <strong>' + safe(data.date) + ' at ' + safe(data.time) + '</strong></div>' +
      '<div><span>Guests:</span> <strong>' + data.guests + ' Persons</strong></div>' +
      (data.occasion ? '<div><span>Occasion:</span> <strong>' + safe(data.occasion) + '</strong></div>' : '') +
      '<div style="margin-top:14px;padding:12px;background:rgba(71,209,130,0.12);border-radius:10px;color:#047857;font-size:13px;">' +
      '✅ Reservation saved &amp; email sent to the cafe. We\'ll confirm by phone.' +
      '</div>';
  }

  /* ---------- Wire the form ---------- */
  function wireForm() {
    var form       = document.getElementById('reservation-form');
    if (!form) return;

    var guestCount = document.getElementById('guest-count');
    var guests     = 2;
    var minusBtn   = document.getElementById('guest-minus');
    var plusBtn    = document.getElementById('guest-plus');
    var dateInput  = document.getElementById('r-date');
    var submitBtn  = form.querySelector('.submit-btn');

    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

    if (minusBtn) minusBtn.addEventListener('click', function () {
      guests = Math.max(1, guests - 1);
      if (guestCount) guestCount.textContent = guests;
    });
    if (plusBtn) plusBtn.addEventListener('click', function () {
      guests = Math.min(20, guests + 1);
      if (guestCount) guestCount.textContent = guests;
    });

    // Prefetch CSRF on load
    fetchCsrfToken();

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var name     = (document.getElementById('r-name') || {}).value || '';
      var phone    = (document.getElementById('r-phone') || {}).value || '';
      var date     = (document.getElementById('r-date') || {}).value || '';
      var time     = (document.getElementById('r-time') || {}).value || '';
      var occasion = (document.getElementById('r-occasion') || {}).value || '';
      var notes    = (document.getElementById('r-notes') || {}).value || '';

      // Client-side validation
      if (!name.trim() || name.trim().length < 2) {
        showToast('Please enter a valid full name.', 'error'); return;
      }
      if (!phone.trim() || !/^\+?[\d\s\-]{7,15}$/.test(phone.trim())) {
        showToast('Please enter a valid phone number.', 'error'); return;
      }
      if (!date) { showToast('Please select a date.', 'error'); return; }
      if (!time) { showToast('Please select a time slot.', 'error'); return; }

      // Ensure fresh CSRF
      if (!csrfToken) await fetchCsrfToken();

      // Disable button & show loading
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

      var reservationData = {
        name: name.trim(),
        phone: phone.trim(),
        guests: guests,
        date: date,
        time: time,
        occasion: occasion || 'Regular Visit',
        notes: notes.trim()
      };

      try {
        var result = await submitReservation(reservationData);
        var refId  = result.reservationId || ('BBC-' + Date.now());

        // Also save to localStorage so admin.html still shows it
        if (window.CafeStore) {
          window.CafeStore.addReservation(Object.assign({ id: refId }, reservationData));
        }

        // Show confirmation panel
        var refEl     = document.getElementById('confirm-ref');
        var detailsEl = document.getElementById('confirm-details');
        if (refEl) refEl.textContent = 'REF: ' + refId;
        if (detailsEl) detailsEl.innerHTML = buildConfirmHTML(reservationData, refId);

        var formStage    = document.getElementById('form-stage');
        var confirmPanel = document.getElementById('confirm-panel');
        if (formStage)    formStage.style.display    = 'none';
        if (confirmPanel) confirmPanel.style.display = 'block';

        showToast('Table Reserved! Confirmation email sent to the cafe. 🎉');

      } catch (err) {
        console.error('[Reservation] Error:', err.message);

        // Graceful fallback — save locally even if backend is down
        if (window.CafeStore) {
          var localRef = window.CafeStore.addReservation(reservationData);
          var refEl2     = document.getElementById('confirm-ref');
          var detailsEl2 = document.getElementById('confirm-details');
          if (refEl2) refEl2.textContent = 'REF: ' + localRef.id;
          if (detailsEl2) detailsEl2.innerHTML =
            buildConfirmHTML(reservationData, localRef.id) +
            '<div style="margin-top:10px;padding:10px;background:rgba(245,158,11,0.12);border-radius:8px;color:#92400e;font-size:12px;">' +
            '⚠️ Email notification pending — backend offline. Reservation saved locally.' +
            '</div>';

          var fs2 = document.getElementById('form-stage');
          var cp2 = document.getElementById('confirm-panel');
          if (fs2) fs2.style.display    = 'none';
          if (cp2) cp2.style.display = 'block';

          showToast('Reservation saved! (Offline mode — email pending)');
        } else {
          showToast('Error: ' + err.message, 'error');
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Reservation'; }
      }
    });

    // Reset button
    var newResBtn = document.getElementById('new-reservation');
    if (newResBtn) {
      newResBtn.addEventListener('click', function () {
        form.reset();
        guests = 2;
        if (guestCount) guestCount.textContent = guests;
        var formStage    = document.getElementById('form-stage');
        var confirmPanel = document.getElementById('confirm-panel');
        if (confirmPanel) confirmPanel.style.display = 'none';
        if (formStage)    formStage.style.display    = 'block';
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireForm);
  } else {
    wireForm();
  }

})();
