/* ==========================================================================
   BREW BUTTERFLY CAFE — SECURE ADMIN API & AUTH INTEGRATION
   Handles JWT Login, Session Persistence, Password Updates, and API Sync.
   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL = window.getBrewButterflyBackendUrl
    ? window.getBrewButterflyBackendUrl('https://brew-butterfly-cafe-1.onrender.com')
    : 'https://brew-butterfly-cafe-1.onrender.com';
  var TOKEN_KEY   = 'bbc_admin_jwt';
  var USER_KEY    = 'bbc_admin_user';

  // Elements
  var loginOverlay = document.getElementById('login-overlay');
  var loginForm    = document.getElementById('login-form');
  var loginError   = document.getElementById('login-error');
  var logoutBtn    = document.getElementById('logout-btn');
  var userLabel    = document.getElementById('logged-in-user');
  var statusBadge  = document.getElementById('backend-status');

  var changePwdForm = document.getElementById('change-pwd-form');
  var syncBtn       = document.getElementById('btn-sync-backend');
  var refreshResBtn = document.getElementById('btn-refresh-res');

  /* ---------- GET SAVED TOKEN ---------- */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, username) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    localStorage.setItem(USER_KEY, username || 'Tejbinayak Manager');
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.__bbcAdminAuthenticated = false;
  }

  function setAuthUI(isAuthenticated, userName) {
    var user = userName || localStorage.getItem(USER_KEY) || 'Tejbinayak Manager';
    var shouldShowOverlay = !isAuthenticated;

    if (loginOverlay) {
      loginOverlay.classList.toggle('hide', isAuthenticated);
    }

    if (userLabel) {
      userLabel.textContent = isAuthenticated ? user : 'Guest';
    }

    document.body.classList.toggle('admin-authenticated', isAuthenticated);
    document.body.classList.toggle('admin-unauthenticated', !isAuthenticated);
    window.__bbcAdminAuthenticated = isAuthenticated;
    window.__bbcAdminUser = user;

    if (statusBadge) {
      if (isAuthenticated) {
        statusBadge.className = 'backend-badge online';
        statusBadge.innerHTML = '<span class="dot"></span> Logged in';
      } else {
        statusBadge.className = 'backend-badge offline';
        statusBadge.innerHTML = '<span class="dot"></span> Sign in to access admin';
      }
    }

    if (isAuthenticated && window.dispatchEvent) {
      window.dispatchEvent(new Event('admin-auth-state-changed'));
    }

    return shouldShowOverlay;
  }

  /* ---------- UPDATE UI STATE ---------- */
  function checkAuth() {
    var storedUser = localStorage.getItem(USER_KEY) || 'Tejbinayak Manager';

    fetch(BACKEND_URL + '/api/admin/session', {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('unauthenticated');
        }
        return res.json();
      })
      .then(function (data) {
        var user = data && data.user && data.user.username ? data.user.username : storedUser;
        setAuthUI(true, user);
        checkBackendHealth();
      })
      .catch(function () {
        setAuthUI(false, storedUser);
      });
  }

  /* ---------- CHECK BACKEND HEALTH ---------- */
  function checkBackendHealth() {
    fetch(BACKEND_URL + '/api/csrf-token', {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (res.ok && statusBadge) {
          statusBadge.className = 'backend-badge online';
          statusBadge.innerHTML = '<span class="dot"></span> Backend Online';
        } else if (statusBadge) {
          statusBadge.className = 'backend-badge offline';
          statusBadge.innerHTML = '<span class="dot"></span> Backend unavailable';
        }
      })
      .catch(function () {
        if (statusBadge) {
          statusBadge.className = 'backend-badge offline';
          statusBadge.innerHTML = '<span class="dot"></span> Backend unavailable';
        }
      });
  }

  /* ---------- LOGIN FORM HANDLER ---------- */
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = (document.getElementById('login-username') || {}).value || '';
      var password = (document.getElementById('login-password') || {}).value || '';
 
      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }
 
      var loginBtn = document.getElementById('login-btn');
      if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Verifying...'; }
      hideError();
 
      fetch(BACKEND_URL + '/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || 'Authentication failed');
            return data;
          });
        })
        .then(function (data) {
          if (!data || !data.token) {
            throw new Error('Authentication failed.');
          }
          setSession(data.token, data.username || username);
          checkAuth();
        })
        .catch(function (err) {
          showError(err.message || 'Invalid username or password.');
        })
        .finally(function () {
          if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; }
        });
    });
  }

  function showError(msg) {
    if (loginError) {
      loginError.textContent = msg;
      loginError.style.display = 'block';
    }
  }

  function hideError() {
    if (loginError) loginError.style.display = 'none';
  }

  /* ---------- LOGOUT HANDLER ---------- */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch(BACKEND_URL + '/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' }
      }).finally(function () {
        clearSession();
        checkAuth();
      });
    });
  }

  function requireAuth() {
    if (!getToken()) {
      if (loginOverlay) {
        loginOverlay.classList.remove('hide');
      }
      throw new Error('Please sign in to access the admin dashboard.');
    }
  }

  /* ---------- CHANGE PASSWORD HANDLER ---------- */
  if (changePwdForm) {
    changePwdForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var currentPassword = (document.getElementById('cp-current') || {}).value || '';
      var newPassword     = (document.getElementById('cp-new') || {}).value || '';

      var token = getToken();
      if (!token) { alert('Please log in first.'); return; }

      fetch(BACKEND_URL + '/api/admin/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
      })
        .then(function (res) {
          return res.json().then(function (d) {
            if (!res.ok) throw new Error(d.error || 'Failed to update password');
            return d;
          });
        })
        .then(function (d) {
          alert('✅ ' + d.message);
          changePwdForm.reset();
        })
        .catch(function (err) {
          alert('❌ Error: ' + err.message);
        });
    });
  }

  /* ---------- SYNC LOCAL DATA TO BACKEND ---------- */
  if (syncBtn) {
    syncBtn.addEventListener('click', function () {
      var token = getToken();
      if (!token) { alert('Please sign in to sync with backend.'); return; }

      var menu = window.CafeStore ? window.CafeStore.getMenu() : [];
      if (!menu.length) { alert('No local menu items to sync.'); return; }

      syncBtn.disabled = true;
      syncBtn.textContent = 'Syncing...';

      fetch(BACKEND_URL + '/api/admin/menu/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(menu)
      })
        .then(function (res) { return res.json(); })
        .then(function (d) {
          alert('✅ Successfully synced ' + (d.synced || menu.length) + ' menu items to backend SQLite database!');
        })
        .catch(function (err) {
          alert('❌ Sync failed: ' + err.message);
        })
        .finally(function () {
          syncBtn.disabled = false;
          syncBtn.textContent = '☁️ Sync to Backend';
        });
    });
  }

  /* ---------- REFRESH RESERVATIONS FROM BACKEND ---------- */
  if (refreshResBtn) {
    refreshResBtn.addEventListener('click', function () {
      var token = getToken();
      if (!token) return;

      fetch(BACKEND_URL + '/api/admin/reservations', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      })
        .then(function (r) { return r.json(); })
        .then(function (items) {
          if (Array.isArray(items) && window.CafeStore) {
            localStorage.setItem('bbc_reservations_v2', JSON.stringify(items));
            window.CafeStore.notifyChange();
            alert('Updated reservation list from backend database.');
          }
        })
        .catch(function (err) {
          console.warn('[AdminAPI] Could not fetch remote reservations:', err.message);
        });
    });
  }

  // Initialize Auth Check
  checkAuth();

})();

