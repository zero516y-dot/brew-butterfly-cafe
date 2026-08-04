
/* ==========================================================================
   BREW BUTTERFLY CAFE — RESERVATION MODULE
   Frontend: Vercel
   Backend: Render

   Handles:
   - CSRF token
   - Reservation validation
   - Backend API submission
   - Confirmation UI
   - Error handling

   IMPORTANT:
   Reservations are now submitted ONLY to the live backend.
   We do NOT silently switch to local/offline mode.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIG
     ------------------------------------------------------------------------ */

  var BACKEND_URL =
    'https://brew-butterfly-cafe-1.onrender.com';

  var csrfToken = null;

  /* ------------------------------------------------------------------------
     CSRF TOKEN
     ------------------------------------------------------------------------ */

  async function fetchCsrfToken() {
    try {
      var response = await fetch(
        BACKEND_URL + '/api/csrf-token',
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        throw new Error(
          'Unable to get security token. Server returned ' +
          response.status
        );
      }

      var data = await response.json();

      if (!data || !data.csrfToken) {
        throw new Error(
          'Backend did not return a valid CSRF token.'
        );
      }

      csrfToken = data.csrfToken;

      console.log(
        '[Reservation] CSRF token received.'
      );

      return csrfToken;

    } catch (error) {
      csrfToken = null;

      console.error(
        '[Reservation] CSRF error:',
        error
      );

      throw new Error(
        'Unable to connect securely to the reservation server. Please try again.'
      );
    }
  }

  /* ------------------------------------------------------------------------
     SANITIZE HELPER
     ------------------------------------------------------------------------ */

  function safe(str) {
    return String(str || '')
      .trim()
      .replace(/[<>&"]/g, function (c) {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;'
        }[c];
      });
  }

  /* ------------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------------ */

  function showToast(msg, type) {
    var toast = document.getElementById('toast');
    var text = document.getElementById('toast-text');

    if (!toast || !text) {
      alert(msg);
      return;
    }

    text.textContent = msg;

    toast.className =
      'toast show' +
      (type === 'error' ? ' toast-error' : '');

    clearTimeout(toast._timer);

    toast._timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 5000);
  }

  /* ------------------------------------------------------------------------
     SUBMIT RESERVATION
     ------------------------------------------------------------------------ */

  async function submitReservation(data) {

    /*
     * Always make sure we have a fresh CSRF token.
     */
    if (!csrfToken) {
      await fetchCsrfToken();
    }

    var response;

    try {
      response = await fetch(
        BACKEND_URL + '/api/reserve',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': csrfToken
          },

          credentials: 'include',

          body: JSON.stringify(data)
        }
      );

    } catch (networkError) {

      console.error(
        '[Reservation] Network error:',
        networkError
      );

      throw new Error(
        'Cannot connect to the reservation server. Please check your internet connection and try again.'
      );
    }

    /*
     * Read response safely.
     */
    var body = {};

    try {
      body = await response.json();
    } catch (jsonError) {
      console.error(
        '[Reservation] Invalid server response:',
        jsonError
      );
    }

    /*
     * Handle backend errors.
     */
    if (!response.ok) {

      console.error(
        '[Reservation] Backend error:',
        response.status,
        body
      );

      /*
       * CSRF token may have expired.
       * Get a new one and retry once.
       */
      if (
        response.status === 403 &&
        csrfToken
      ) {
        console.warn(
          '[Reservation] CSRF rejected. Refreshing token and retrying...'
        );

        csrfToken = null;

        await fetchCsrfToken();

        return submitReservation(data);
      }

      throw new Error(
        body.error ||
        'Reservation failed. Please try again.'
      );
    }

    return body;
  }

  /* ------------------------------------------------------------------------
     CONFIRMATION HTML
     ------------------------------------------------------------------------ */

  function buildConfirmHTML(
    data,
    reservationId
  ) {

    return (
      '<div>' +
        '<span>Name:</span> ' +
        '<strong>' +
          safe(data.name) +
        '</strong>' +
      '</div>' +

      '<div>' +
        '<span>Date &amp; Time:</span> ' +
        '<strong>' +
          safe(data.date) +
          ' at ' +
          safe(data.time) +
        '</strong>' +
      '</div>' +

      '<div>' +
        '<span>Guests:</span> ' +
        '<strong>' +
          safe(data.guests) +
          ' Persons' +
        '</strong>' +
      '</div>' +

      (
        data.occasion
          ? '<div>' +
              '<span>Occasion:</span> ' +
              '<strong>' +
                safe(data.occasion) +
              '</strong>' +
            '</div>'
          : ''
      ) +

      '<div style="' +
        'margin-top:14px;' +
        'padding:12px;' +
        'background:rgba(71,209,130,0.12);' +
        'border-radius:10px;' +
        'color:#047857;' +
        'font-size:13px;' +
      '">' +

        '✅ Reservation received successfully. ' +
        'We will contact you to confirm your table.' +

      '</div>'
    );
  }

  /* ------------------------------------------------------------------------
     SHOW CONFIRMATION
     ------------------------------------------------------------------------ */

  function showConfirmation(
    reservationData,
    reservationId
  ) {

    var refEl =
      document.getElementById('confirm-ref');

    var detailsEl =
      document.getElementById('confirm-details');

    if (refEl) {
      refEl.textContent =
        'REF: ' + reservationId;
    }

    if (detailsEl) {
      detailsEl.innerHTML =
        buildConfirmHTML(
          reservationData,
          reservationId
        );
    }

    var formStage =
      document.getElementById('form-stage');

    var confirmPanel =
      document.getElementById('confirm-panel');

    if (formStage) {
      formStage.style.display = 'none';
    }

    if (confirmPanel) {
      confirmPanel.style.display = 'block';
    }
  }

  /* ------------------------------------------------------------------------
     FORM
     ------------------------------------------------------------------------ */

  function wireForm() {

    var form =
      document.getElementById(
        'reservation-form'
      );

    if (!form) {
      console.warn(
        '[Reservation] reservation-form not found.'
      );

      return;
    }

    var guestCount =
      document.getElementById(
        'guest-count'
      );

    var guests = 2;

    var minusBtn =
      document.getElementById(
        'guest-minus'
      );

    var plusBtn =
      document.getElementById(
        'guest-plus'
      );

    var dateInput =
      document.getElementById(
        'r-date'
      );

    var submitBtn =
      form.querySelector(
        '.submit-btn'
      );

    /* ----------------------------------------------------------------------
       DATE MINIMUM
       ---------------------------------------------------------------------- */

    if (dateInput) {

      var today =
        new Date()
          .toISOString()
          .split('T')[0];

      dateInput.min = today;
    }

    /* ----------------------------------------------------------------------
       GUEST MINUS
       ---------------------------------------------------------------------- */

    if (minusBtn) {

      minusBtn.addEventListener(
        'click',
        function () {

          guests =
            Math.max(
              1,
              guests - 1
            );

          if (guestCount) {
            guestCount.textContent =
              guests;
          }
        }
      );
    }

    /* ----------------------------------------------------------------------
       GUEST PLUS
       ---------------------------------------------------------------------- */

    if (plusBtn) {

      plusBtn.addEventListener(
        'click',
        function () {

          guests =
            Math.min(
              20,
              guests + 1
            );

          if (guestCount) {
            guestCount.textContent =
              guests;
          }
        }
      );
    }

    /* ----------------------------------------------------------------------
       GET CSRF TOKEN
       ---------------------------------------------------------------------- */

    /*
     * We intentionally do NOT silently ignore errors here.
     */
    fetchCsrfToken()
      .catch(function (error) {

        console.error(
          '[Reservation] Initial CSRF request failed:',
          error
        );

      });

    /* ----------------------------------------------------------------------
       FORM SUBMIT
       ---------------------------------------------------------------------- */

    form.addEventListener(
      'submit',
      async function (e) {

        e.preventDefault();

        /* --------------------------------------------------------------
           READ FORM VALUES
           -------------------------------------------------------------- */

        var name =
          (
            document.getElementById(
              'r-name'
            ) || {}
          ).value || '';

        var phone =
          (
            document.getElementById(
              'r-phone'
            ) || {}
          ).value || '';

        var date =
          (
            document.getElementById(
              'r-date'
            ) || {}
          ).value || '';

        var time =
          (
            document.getElementById(
              'r-time'
            ) || {}
          ).value || '';

        var occasion =
          (
            document.getElementById(
              'r-occasion'
            ) || {}
          ).value || '';

        var notes =
          (
            document.getElementById(
              'r-notes'
            ) || {}
          ).value || '';

        /* --------------------------------------------------------------
           VALIDATION
           -------------------------------------------------------------- */

        if (
          !name.trim() ||
          name.trim().length < 2
        ) {

          showToast(
            'Please enter a valid full name.',
            'error'
          );

          return;
        }

        if (
          !phone.trim() ||
          !/^\+?[\d\s\-]{7,15}$/.test(
            phone.trim()
          )
        ) {

          showToast(
            'Please enter a valid phone number.',
            'error'
          );

          return;
        }

        if (!date) {

          showToast(
            'Please select a date.',
            'error'
          );

          return;
        }

        if (!time) {

          showToast(
            'Please select a time slot.',
            'error'
          );

          return;
        }

        /* --------------------------------------------------------------
           RESERVATION DATA
           -------------------------------------------------------------- */

        var reservationData = {

          name:
            name.trim(),

          phone:
            phone.trim(),

          guests:
            guests,

          date:
            date,

          time:
            time,

          occasion:
            occasion.trim() ||
            'Regular Visit',

          notes:
            notes.trim()
        };

        /* --------------------------------------------------------------
           BUTTON LOADING
           -------------------------------------------------------------- */

        if (submitBtn) {

          submitBtn.disabled = true;

          submitBtn.textContent =
            'Submitting…';
        }

        try {

          console.log(
            '[Reservation] Sending reservation to:',
            BACKEND_URL + '/api/reserve'
          );

          /* ------------------------------------------------------------
             SEND TO REAL BACKEND
             ------------------------------------------------------------ */

          var result =
            await submitReservation(
              reservationData
            );

          console.log(
            '[Reservation] Backend response:',
            result
          );

          var refId =
            result.reservationId ||
            ('BBC-' + Date.now());

          /* ------------------------------------------------------------
             OPTIONAL LOCAL CACHE
             ------------------------------------------------------------ */

          /*
           * LocalStorage is ONLY a cache now.
           * It is NOT treated as the actual reservation database.
           */
          if (
            window.CafeStore &&
            typeof window.CafeStore.addReservation ===
              'function'
          ) {

            try {

              window.CafeStore.addReservation(
                Object.assign(
                  {
                    id: refId,
                    source: 'backend'
                  },
                  reservationData
                )
              );

            } catch (storageError) {

              console.warn(
                '[Reservation] Local cache failed:',
                storageError
              );

            }
          }

          /* ------------------------------------------------------------
             SHOW SUCCESS
             ------------------------------------------------------------ */

          showConfirmation(
            reservationData,
            refId
          );

          showToast(
            'Table reserved successfully! 🎉'
          );

        } catch (err) {

          console.error(
            '[Reservation] Submission failed:',
            err
          );

          /*
           * IMPORTANT:
           *
           * We no longer create a fake local reservation here.
           *
           * If the backend failed, the customer must know that
           * the reservation was NOT confirmed.
           */

          showToast(
            err.message ||
            'Reservation failed. Please try again.',
            'error'
          );

        } finally {

          if (submitBtn) {

            submitBtn.disabled = false;

            submitBtn.textContent =
              'Submit Reservation';
          }
        }
      }
    );

    /* ----------------------------------------------------------------------
       NEW RESERVATION
       ---------------------------------------------------------------------- */

    var newResBtn =
      document.getElementById(
        'new-reservation'
      );

    if (newResBtn) {

      newResBtn.addEventListener(
        'click',
        function () {

          form.reset();

          guests = 2;

          if (guestCount) {
            guestCount.textContent =
              guests;
          }

          var formStage =
            document.getElementById(
              'form-stage'
            );

          var confirmPanel =
            document.getElementById(
              'confirm-panel'
            );

          if (confirmPanel) {
            confirmPanel.style.display =
              'none';
          }

          if (formStage) {
            formStage.style.display =
              'block';
          }

          /*
           * Get a fresh CSRF token for
           * the next reservation.
           */
          csrfToken = null;

          fetchCsrfToken()
            .catch(function (error) {

              console.error(
                '[Reservation] CSRF refresh failed:',
                error
              );

            });
        }
      );
    }
  }

  /* ------------------------------------------------------------------------
     INITIALIZE
     ------------------------------------------------------------------------ */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      wireForm
    );

  } else {

    wireForm();
  }

})();
```
