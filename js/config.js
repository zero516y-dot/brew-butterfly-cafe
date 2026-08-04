(function () {
  'use strict';

  var DEFAULT_BACKEND_URL = 'https://brew-butterfly-cafe-1.onrender.com';
  var config = window.BrewButterflyConfig || (window.BrewButterflyConfig = {});

  function normalizeUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function resolveBackendUrl() {
    var meta = document.querySelector('meta[name="brew-butterfly-backend-url"]');
    var fromMeta = meta && meta.content ? meta.content : '';
    var candidate = normalizeUrl(
      config.backendUrl ||
      window.__BREW_BUTTERFLY_BACKEND_URL__ ||
      window.BREW_BUTTERFLY_BACKEND_URL ||
      fromMeta ||
      DEFAULT_BACKEND_URL
    );

    return candidate || DEFAULT_BACKEND_URL;
  }

  config.backendUrl = resolveBackendUrl();

  window.getBrewButterflyBackendUrl = function (fallback) {
    var value = normalizeUrl(config.backendUrl || fallback || DEFAULT_BACKEND_URL);
    return value || DEFAULT_BACKEND_URL;
  };
})();
