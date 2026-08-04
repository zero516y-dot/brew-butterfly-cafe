
/* ==========================================================================
   BREW BUTTERFLY CAFE — RESERVATION MODULE

   Frontend:
   https://brew-butterfly-cafe.vercel.app

   Backend:
   https://brew-butterfly-cafe-1.onrender.com

   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL = 'https://brew-butterfly-cafe-1.onrender.com';
  var csrfToken = null;
  var csrfPromise = null;

  /* ========================================================================
     TOAST
     ======================================================================== */

  function showToast(message, type) {
    var toast = document.getElementById('toast');
    var text = document.getElementById('toast-text');

    if (!toast || !text) {
      alert(message);
      return;
    }

    text.textContent = message;

    toast.className =
      'toast show' +
      (type === 'error' ? ' toast-error' : '');

    clearTimeout(toast._timer);

    toast._timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 5000);
  }

  /* ========================================================================
     HTML SAFE TEXT
     ======================================================================== */

  function safe(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ========================================================================
     GET CSRF TOKEN
     ======================================================================== */

  function fetchCsrfToken() {
    if (csrfToken) {
      return Promise.resolve(csrfToken);
    }

    if (csrfPromise) {
      return csrfPromise;
    }

    csrfPromise = fetch(
      BACKEND_URL + '/api/csrf-token',
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      }
    )
      .then(function (response) {

        if (!response.ok) {
          throw new Error(
            'Security server error: HTTP ' +
            response.status
          );
        }

        return response.json();
      })
      .then(function (data) {

        if (!data || !data.csrfToken) {
          throw new Error(
            'The reservation server did not provide a security token.'
          );
        }

        csrfToken = data.csrfToken;

        console.log(
          '[Reservation] CSRF token loaded successfully.'
        );

        return csrfToken;
      })
      .catch(function (error) {

        csrfToken = null;

        console.error(
          '[Reservation] CSRF error:',
          error
        );

        throw error;

      })
      .finally(function () {
        csrfPromise = null;
      });

    return csrfPromise;
  }

  /* ========================================================================
     SUBMIT RESERVATION
     ======================================================================== */

  function submitReservation(data, retry) {

    retry = retry || false;

    return fetchCsrfToken()
      .then(function (token) {

        return fetch(
          BACKEND_URL + '/api/reserve',
          {
            method: 'POST',

            credentials: 'include',

            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRF-Token': token
            },

            body: JSON.stringify(data)
          }
        );
      })

      .then(function (response) {

        return response.text()
          .then(function (text) {

            var body = {};

            try {
              body = text
                ? JSON.parse(text)
                : {};
            } catch (error) {
              body = {
                error: text || 'Invalid server response.'
              };
            }

            return {
              response: response,
              body: body
            };
          });
      })

      .then(function (result) {

        var response = result.response;
        var body = result.body;

        console.log(
          '[Reservation] Backend status:',
          response.status
        );

        if (response.ok) {
          return body;
        }

        /*
         * CSRF token expired/invalid.
         * Get a new token and retry exactly once.
         */
        if (
          response.status === 403 &&
          !retry
        ) {

          console.warn(
            '[Reservation] CSRF rejected. Refreshing token...'
          );

          csrfToken = null;

          return submitReservation(
            data,
            true
          );
        }

        throw new Error(
          body.error ||
          'Reservation failed. Server returned HTTP ' +
          response.status
        );
      });
  }

  /* ========================================================================
     CONFIRMATION HTML
     ======================================================================== */

  function buildConfirmHTML(data) {

    var html = '';

    html +=
      '<div>' +
        '<span>Name:</span> ' +
        '<strong>' +
          safe(data.name) +
        '</strong>' +
      '</div>';

    html +=
      '<div>' +
        '<span>Date &amp; Time:</span> ' +
        '<strong>' +
          safe(data.date) +
          ' at ' +
          safe(data.time) +
        '</strong>' +
      '</div>';

    html +=
      '<div>' +
        '<span>Guests:</span> ' +
        '<strong>' +
          safe(data.guests) +
          ' Persons' +
        '</strong>' +
      '</div>';

    if (data.occasion) {
      html +=
        '<div>' +
          '<span>Occasion:</span> ' +
          '<strong>' +
            safe(data.occasion) +
          '</strong>' +
        '</div>';
    }

    html +=
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
      '</div>';

    return html;
  }

  /* ========================================================================
     SHOW CONFIRMATION
     ======================================================================== */

  function showConfirmation(data, reservationId) {

    var refEl =
      document.getElementById('confirm-ref');

    var detailsEl =
      document.getElementById('confirm-details');

    var formStage =
      document.getElementById('form-stage');

    var confirmPanel =
      document.getElementById('confirm-panel');

    if (refEl) {
      refEl.textContent =
        'REF: ' + reservationId;
    }

    if (detailsEl) {
      detailsEl.innerHTML =
        buildConfirmHTML(data);
    }

    if (formStage) {
      formStage.style.display = 'none';
    }

    if (confirmPanel) {
      confirmPanel.style.display = 'block';
    }
  }

  /* ========================================================================
     RESET FORM
     ======================================================================== */

  function resetReservationForm(form, guestCount) {

    form.reset();

    if (guestCount) {
      guestCount.textContent = '2';
    }

    var formStage =
      document.getElementById('form-stage');

    var confirmPanel =
      document.getElementById('confirm-panel');

    if (confirmPanel) {
      confirmPanel.style.display = 'none';
    }

    if (formStage) {
      formStage.style.display = 'block';
    }

    /*
     * Force a fresh CSRF token for the next reservation.
     */
    csrfToken = null;
    csrfPromise = null;

    fetchCsrfToken()
      .catch(function (error) {
        console.error(
          '[Reservation] CSRF refresh failed:',
          error
        );
      });
  }

  /* ========================================================================
     INITIALIZE FORM
     ======================================================================== */

  function wireForm() {

    var form =
      document.getElementById('reservation-form');

    if (!form) {
      console.warn(
        '[Reservation] #reservation-form was not found.'
      );
      return;
    }

    var guestCount =
      document.getElementById('guest-count');

    var minusBtn =
      document.getElementById('guest-minus');

    var plusBtn =
      document.getElementById('guest-plus');

    var dateInput =
      document.getElementById('r-date');

    var submitBtn =
      form.querySelector('.submit-btn');

    var newReservationBtn =
      document.getElementById('new-reservation');

    var guests = 2;

    /* ----------------------------------------------------------------------
       DATE
       ---------------------------------------------------------------------- */

    if (dateInput) {

      var today =
        new Date()
          .toISOString()
          .split('T')[0];

      dateInput.min = today;
    }

    /* ----------------------------------------------------------------------
       INITIAL GUEST COUNT
       ---------------------------------------------------------------------- */

    if (guestCount) {
      guestCount.textContent = guests;
    }

    /* ----------------------------------------------------------------------
       MINUS GUEST
       ---------------------------------------------------------------------- */

    if (minusBtn) {

      minusBtn.addEventListener(
        'click',
        function (event) {

          event.preventDefault();

          guests =
            Math.max(
              1,
              guests - 1
            );

          if (guestCount) {
            guestCount.textContent = guests;
          }
        }
      );
    }

    /* ----------------------------------------------------------------------
       PLUS GUEST
       ---------------------------------------------------------------------- */

    if (plusBtn) {

      plusBtn.addEventListener(
        'click',
        function (event) {

          event.preventDefault();

          guests =
            Math.min(
              20,
              guests + 1
            );

          if (guestCount) {
            guestCount.textContent = guests;
          }
        }
      );
    }

    /* ----------------------------------------------------------------------
       PRELOAD CSRF
       ---------------------------------------------------------------------- */

    fetchCsrfToken()
      .catch(function (error) {

        console.warn(
          '[Reservation] Backend connection not ready:',
          error.message
        );

      });

    /* ======================================================================
       SUBMIT
       ====================================================================== */

    form.addEventListener(
      'submit',
      function (event) {

        event.preventDefault();

        /* ------------------------------------------------------------------
           GET VALUES
           ------------------------------------------------------------------ */

        var nameInput =
          document.getElementById('r-name');

        var phoneInput =
          document.getElementById('r-phone');

        var dateField =
          document.getElementById('r-date');

        var timeField =
          document.getElementById('r-time');

        var occasionField =
          document.getElementById('r-occasion');

        var notesField =
          document.getElementById('r-notes');

        var name =
          nameInput
            ? nameInput.value.trim()
            : '';

        var phone =
          phoneInput
            ? phoneInput.value.trim()
            : '';

        var date =
          dateField
            ? dateField.value
            : '';

        var time =
          timeField
            ? timeField.value
            : '';

        var occasion =
          occasionField
            ? occasionField.value.trim()
            : '';

        var notes =
          notesField
            ? notesField.value.trim()
            : '';

        /* ------------------------------------------------------------------
           VALIDATE NAME
           ------------------------------------------------------------------ */

        if (
          !name ||
          name.length < 2
        ) {

          showToast(
            'Please enter a valid full name.',
            'error'
          );

          return;
        }

        /* ------------------------------------------------------------------
           VALIDATE PHONE
           ------------------------------------------------------------------ */

        if (
          !phone ||
          !/^\+?[\d\s\-]{7,15}$/.test(phone)
        ) {

          showToast(
            'Please enter a valid phone number.',
            'error'
          );

          return;
        }

        /* ------------------------------------------------------------------
           VALIDATE DATE
           ------------------------------------------------------------------ */

        if (!date) {

          showToast(
            'Please select a date.',
            'error'
          );

          return;
        }

        /* ------------------------------------------------------------------
           VALIDATE TIME
           ------------------------------------------------------------------ */

        if (!time) {

          showToast(
            'Please select a time slot.',
            'error'
          );

          return;
        }

        /* ------------------------------------------------------------------
           BUILD DATA
           ------------------------------------------------------------------ */

        var reservationData = {
          name: name,
          phone: phone,
          guests: guests,
          date: date,
          time: time,
          occasion: occasion || 'Regular Visit',
          notes: notes
        };

        /* ------------------------------------------------------------------
           LOADING
           ------------------------------------------------------------------ */

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting…';
        }

        showToast(
          'Sending reservation...'
        );

        /* ------------------------------------------------------------------
           SEND TO RENDER
           ------------------------------------------------------------------ */

        submitReservation(
          reservationData,
          false
        )
          .then(function (result) {

            console.log(
              '[Reservation] Success:',
              result
            );

            var reservationId =
              result.reservationId ||
              ('BBC-' + Date.now());

            /*
             * LocalStorage is ONLY an optional cache.
             * The real reservation is already stored by the backend.
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
                      id: reservationId,
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

            showConfirmation(
              reservationData,
              reservationId
            );

            showToast(
              'Table reserved successfully! 🎉'
            );

          })
          .catch(function (error) {

            console.error(
              '[Reservation] FAILED:',
              error
            );

            /*
             * IMPORTANT:
             *
             * We DO NOT save a fake offline reservation.
             *
             * If Render fails, the customer sees the actual
             * failure instead of believing the booking succeeded.
             */

            var message =
              error &&
              error.message
                ? error.message
                : 'Reservation failed. Please try again.';

            showToast(
              message,
              'error'
            );

          })
          .finally(function () {

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent =
                'Submit Reservation';
            }

          });
      }
    );

    /* ======================================================================
       NEW RESERVATION
       ====================================================================== */

    if (newReservationBtn) {

      newReservationBtn.addEventListener(
        'click',
        function (event) {

          event.preventDefault();

          guests = 2;

          resetReservationForm(
            form,
            guestCount
          );
        }
      );
    }
  }

  /* ========================================================================
     START
     ======================================================================== */

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      wireForm
    );

  } else {

    wireForm();
  }

})();

