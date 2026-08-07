/* ==========================================================================
   BREW BUTTERFLY CAFE — SECURE ADMIN API & AUTH INTEGRATION
   JWT Login, Cookie Session, Password Updates, and API Sync.

   Security notes:
   - The JWT is stored in sessionStorage (cleared when the tab closes)
     instead of localStorage. The authoritative session is the httpOnly
     cookie set by the backend, so the token is only a request helper.
   - Any 401 response forces re-login.
   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL = window.getBrewButterflyBackendUrl
    ? window.getBrewButterflyBackendUrl('https://brew-butterfly-cafe-1.onrender.com')
    : 'https://brew-butterfly-cafe-1.onrender.com';
  var TOKEN_KEY = 'bbc_admin_jwt';
  var USER_KEY = 'bbc_admin_user';

  /* ---------- SHARED SESSION (used by admin.js too) ---------- */

  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) { /* storage unavailable */ }
  }

  function getUser() {
    try {
      return sessionStorage.getItem(USER_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setUser(username) {
    try {
      if (username) {
        sessionStorage.setItem(USER_KEY, username);
      } else {
        sessionStorage.removeItem(USER_KEY);
      }
    } catch (e) { /* storage unavailable */ }
  }

  window.BbcAdminSession = {
    getToken: getToken,
    getUser: getUser,
    isAuthenticated: function () {
      return !!getToken() || !!window.__bbcAdminAuthenticated;
    },
    set: function (token, username) {
      setToken(token);
      setUser(username || '');
      window.__bbcAdminAuthenticated = !!token;
      window.__bbcAdminUser = username || '';
    },
    clear: function () {
      setToken('');
      setUser('');
      window.__bbcAdminAuthenticated = false;
      window.__bbcAdminUser = '';
    }
  };

  /* ---------- TOAST NOTIFICATIONS ---------- */

  function showToast(message, type) {
    var container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:2000;display:flex;flex-direction:column;gap:10px;max-width:360px;';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.style.cssText =
      'background:#1e293b;color:#fff;padding:12px 18px;border-radius:10px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,0.25);' +
      (type === 'error'
        ? 'border-left:4px solid #ef4444;'
        : type === 'success'
          ? 'border-left:4px solid #10b981;'
          : 'border-left:4px solid #3457a6;');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .4s';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 450);
    }, 3600);
  }

  window.BbcAdminToast = showToast;

  /* ---------- ELEMENTS ---------- */

  var loginOverlay = document.getElementById('login-overlay');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('logout-btn');
  var userLabel = document.getElementById('logged-in-user');
  var statusBadge = document.getElementById('backend-status');
  var changePwdForm = document.getElementById('change-pwd-form');
  var syncBtn = document.getElementById('btn-sync-backend');
  var refreshResBtn = document.getElementById('btn-refresh-res');

  /* ---------- AUTH UI STATE ---------- */

  function setAuthUI(isAuthenticated, userName) {
    var user = userName || getUser() || 'Manager';
    var shouldShowOverlay = !isAuthenticated;

    if (loginOverlay) {
      loginOverlay.classList.toggle('hide', isAuthenticated);
    }

    if (userLabel) {
      userLabel.textContent = isAuthenticated ? user.charAt(0).toUpperCase() : 'A';
    }

    document.body.classList.toggle('admin-authenticated', isAuthenticated);
    document.body.classList.toggle('admin-unauthenticated', !isAuthenticated);
    window.__bbcAdminAuthenticated = isAuthenticated;
    window.__bbcAdminUser = user;

    if (statusBadge) {
      if (isAuthenticated) {
        statusBadge.className = 'backend-badge online';
        statusBadge.innerHTML = '<span class="dot"></span> Logged in · ' + escapeHtml(user);
      } else {
        statusBadge.className = 'backend-badge offline';
        statusBadge.innerHTML = '<span class="dot"></span> Sign in to access admin';
      }
    }

    window.dispatchEvent(new Event('admin-auth-state-changed'));

    return shouldShowOverlay;
  }

  /* ---------- AUTH CHECK (cookie-first) ---------- */

  function checkAuth() {
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
        var username = data && data.user && data.user.username
          ? data.user.username
          : getUser();
        window.BbcAdminSession.set(getToken() || 'session', username);
        setAuthUI(true, username);
        checkBackendHealth();
      })
      .catch(function () {
        window.BbcAdminSession.clear();
        setAuthUI(false, '');
      });
  }

  /* ---------- BACKEND HEALTH ---------- */

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

  /* ---------- LOGIN ---------- */

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
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verifying...';
      }
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
          window.BbcAdminSession.set(data.token, data.username || username);
          showToast('Welcome back, ' + (data.username || username) + '!', 'success');
          checkAuth();
        })
        .catch(function (err) {
          showError(err.message || 'Invalid username or password.');
        })
        .finally(function () {
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
          }
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

  /* ---------- LOGOUT ---------- */

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch(BACKEND_URL + '/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' }
      }).finally(function () {
        window.BbcAdminSession.clear();
        setAuthUI(false, '');
      });
    });
  }

  /* ---------- FORCED RE-LOGIN ON 401 ---------- */

  window.addEventListener('bbc-admin-unauthorized', function () {
    window.BbcAdminSession.clear();
    setAuthUI(false, '');
    showToast('Your session expired. Please sign in again.', 'error');
  });

  /* ---------- CHANGE PASSWORD ---------- */

  if (changePwdForm) {
    changePwdForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var currentPassword = (document.getElementById('cp-current') || {}).value || '';
      var newPassword = (document.getElementById('cp-new') || {}).value || '';

      var token = getToken();
      if (!token && !window.__bbcAdminAuthenticated) {
        showToast('Please log in first.', 'error');
        return;
      }

      fetch(BACKEND_URL + '/api/admin/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
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
          showToast(d.message || 'Password changed successfully.', 'success');
          changePwdForm.reset();
        })
        .catch(function (err) {
          showToast(err.message || 'Could not change password.', 'error');
        });
    });
  }

  /* ---------- SYNC LOCAL DATA TO BACKEND ---------- */

  if (syncBtn) {
    syncBtn.addEventListener('click', function () {
      var token = getToken();
      if (!token && !window.__bbcAdminAuthenticated) {
        showToast('Please sign in to sync with backend.', 'error');
        return;
      }

      var menu = window.CafeStore ? window.CafeStore.getMenu() : [];
      if (!menu.length) {
        showToast('No menu items to sync.', 'error');
        return;
      }

      syncBtn.disabled = true;
      syncBtn.textContent = 'Syncing...';

      fetch(BACKEND_URL + '/api/admin/menu/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify(menu)
      })
        .then(function (res) {
          return res.json().then(function (d) {
            if (!res.ok) throw new Error(d.error || 'Sync failed');
            return d;
          });
        })
        .then(function (d) {
          showToast('Synced ' + (d.synced || menu.length) + ' menu items to the database.', 'success');
        })
        .catch(function (err) {
          showToast(err.message || 'Sync failed: backend unreachable.', 'error');
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
      fetch(BACKEND_URL + '/api/admin/reservations', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        }
      })
        .then(function (r) {
          if (r.status === 401) {
            window.dispatchEvent(new Event('bbc-admin-unauthorized'));
            throw new Error('unauthorized');
          }
          return r.json();
        })
        .then(function (items) {
          if (Array.isArray(items) && window.CafeStore) {
            try {
              sessionStorage.setItem('bbc_admin_reservations_cache', JSON.stringify(items));
            } catch (e) { /* ignore */ }
            showToast('Reservation list refreshed from backend.', 'success');
            window.dispatchEvent(new Event('admin-reservations-refreshed'));
          } else {
            throw new Error('Unexpected response');
          }
        })
        .catch(function (err) {
          if (err.message !== 'unauthorized') {
            showToast('Could not refresh reservations from backend.', 'error');
          }
        });
    });
  }

  /* ---------- ESCAPE HELPER ---------- */

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  /* ---------- INIT ---------- */

  checkAuth();
})();
