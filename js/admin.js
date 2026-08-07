/* ==========================================================================
   BREW BUTTERFLY CAFE — ADMIN DASHBOARD LOGIC

   When logged out: shows a locked demo preview (read-only).
   When logged in: reads/writes exclusively through the backend API.
   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL = window.getBrewButterflyBackendUrl
    ? window.getBrewButterflyBackendUrl('https://brew-butterfly-cafe-1.onrender.com')
    : 'https://brew-butterfly-cafe-1.onrender.com';

  var session = window.BbcAdminSession || {
    isAuthenticated: function () { return false; },
    getToken: function () { return ''; }
  };

  var toast = window.BbcAdminToast || function () {};

  function getToken() { return session.getToken(); }

  function canUseAdminApi() { return session.isAuthenticated(); }

  function apiHeaders(extra) {
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }
    return Object.assign(headers, extra || {});
  }

  function handleUnauthorized(res) {
    if (res && res.status === 401) {
      window.dispatchEvent(new Event('bbc-admin-unauthorized'));
      return true;
    }
    return false;
  }

  /* ---------- ELEMENTS ---------- */
  var statsItemsCount = document.getElementById('stat-items-count');
  var statsResCount = document.getElementById('stat-res-count');
  var statsCatCount = document.getElementById('stat-cat-count');
  var statsPendingRes = document.getElementById('stat-pending-res');
  var menuTableBody = document.getElementById('admin-menu-tbody');
  var resTableBody = document.getElementById('admin-res-tbody');
  var itemModal = document.getElementById('item-modal');
  var itemForm = document.getElementById('item-form');
  var modalTitle = document.getElementById('modal-title');
  var photoInput = document.getElementById('field-photo');
  var photoPreview = document.getElementById('photo-preview');
  var presetContainer = document.getElementById('preset-photos');
  var editingItemId = null;

  /* ---------- CATEGORY NAMES ---------- */
  var CATEGORY_NAMES = {
    special: 'Special Menu', momo: 'Momo', chowmein: 'Chowmein',
    burger: 'Burger', 'tea-coffee': 'Tea & Coffee', 'cold-drinks': 'Cold Drinks',
    hookah: 'Hookah', lassi: 'Lassi', breakfast: 'Breakfast', snacks: 'Snacks',
    energy: 'Energy Drink', cigarettes: 'Cigarettes'
  };

  function catName(catId) {
    return CATEGORY_NAMES[catId] || catId;
  }

  /* ---------- IMAGE FALLBACK ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fbk) return;
    img.dataset.fbk = '1';
    img.src = '../assets/cafe-vibe.jpg';
  }, true);

  /* ---------- SAFE HELPERS ---------- */
  function safe(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
  var AMP = String.fromCharCode(38);
  var QUOT = String.fromCharCode(34);
  var APOS = String.fromCharCode(39);
  var LT = String.fromCharCode(60);
  var GT = String.fromCharCode(62);

  function safeAttr(str) {
    var text = String(str == null ? '' : str);
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML
      .split(QUOT).join(AMP + 'quot;')
      .split(APOS).join(AMP + '#39;')
      .split(LT).join(AMP + 'lt;')
      .split(GT).join(AMP + 'gt;');
  }

  /* ---------- PHOTO FALLBACK ---------- */
  function fallbackPhoto() {
    return '../assets/cafe-vibe.jpg';
  }

  /* ---------- STATS ---------- */
  function updateStats() {
    if (canUseAdminApi()) {
      fetch(BACKEND_URL + '/api/admin/stats', {
        credentials: 'include',
        headers: apiHeaders()
      })
        .then(function (r) {
          if (handleUnauthorized(r)) return null;
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          if (!d) return;
          if (statsItemsCount) statsItemsCount.textContent = d.totalMenuItems;
          if (statsResCount) statsResCount.textContent = d.totalReservations;
          if (statsPendingRes) statsPendingRes.textContent = d.pendingReservations;
        })
        .catch(function () { /* backend unreachable */ });
    } else {
      updateStatsLocal();
    }
    if (statsCatCount) statsCatCount.textContent = 12;
  }

  function updateStatsLocal() {
    var menu = window.CafeStore ? window.CafeStore.getMenu() : [];
    var reservations = window.CafeStore ? window.CafeStore.getReservations() : [];
    var pending = reservations.filter(function (r) { return r.status === 'Pending'; });
    if (statsItemsCount) statsItemsCount.textContent = menu.length;
    if (statsResCount) statsResCount.textContent = reservations.length;
    if (statsPendingRes) statsPendingRes.textContent = pending.length;
  }

  /* ---------- MENU TABLE ---------- */
  function renderAdminMenu() {
    if (!menuTableBody) return;
    menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Loading…</td></tr>';

    if (!canUseAdminApi()) {
      drawMenuRows(window.CafeStore ? window.CafeStore.getMenu() : []);
      return;
    }

    fetch(BACKEND_URL + '/api/admin/menu', {
      credentials: 'include',
      headers: apiHeaders()
    })
      .then(function (r) {
        if (handleUnauthorized(r)) return [];
        return r.ok ? r.json() : [];
      })
      .then(function (items) {
        drawMenuRows(items || []);
      })
      .catch(function () {
        drawMenuRows([]);
        toast('Could not load menu from backend.', 'error');
      });
  }

  function drawMenuRows(menu) {
    if (!menuTableBody) return;
    menuTableBody.innerHTML = '';

    if (!menu || menu.length === 0) {
      menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No menu items found. Click "+ Add New Menu Item" to create one.</td></tr>';
      return;
    }

    menu.forEach(function (item) {
      var photo = item.photo || fallbackPhoto();
      var inStock = item.inStock !== undefined ? item.inStock : item.in_stock;
      var stockBadge = inStock
        ? '<span class="badge badge-success" style="cursor:pointer;" data-action="toggle-stock" data-id="' + safeAttr(item.id) + '">In Stock</span>'
        : '<span class="badge badge-danger" style="cursor:pointer;" data-action="toggle-stock" data-id="' + safeAttr(item.id) + '">Out of Stock</span>';
      var vegBadge = item.veg
        ? '<span style="color:#10b981;font-weight:600;">● Veg</span>'
        : '<span style="color:#ef4444;font-weight:600;">● Non-Veg</span>';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<img class="dish-thumb" src="' + safeAttr(photo) + '" alt="' + safeAttr(item.name) + '" loading="lazy">' +
            '<div>' +
              '<strong style="display:block;color:#1e293b;">' + safe(item.name) + '</strong>' +
              '<small style="color:#64748b;">' + (item.featured ? '⭐ Featured' : 'Standard') + '</small>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td><span class="badge badge-info">' + safe(catName(item.cat)) + '</span></td>' +
        '<td><strong class="mono">Rs ' + (item.price || 0) + '</strong></td>' +
        '<td>' + vegBadge + '</td>' +
        '<td>' + stockBadge + '</td>' +
        '<td>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn-admin btn-admin-secondary" style="padding:6px 12px;font-size:12.5px;" data-action="edit" data-id="' + safeAttr(item.id) + '">Edit</button>' +
            '<button class="btn-admin btn-admin-danger" style="padding:6px 12px;font-size:12.5px;" data-action="delete" data-id="' + safeAttr(item.id) + '">Delete</button>' +
          '</div>' +
        '</td>';
      menuTableBody.appendChild(tr);
    });
  }

  /* ---------- RESERVATIONS TABLE ---------- */
  function renderAdminReservations() {
    if (!resTableBody) return;
    resTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">Loading…</td></tr>';

    if (!canUseAdminApi()) {
      drawReservationRows(window.CafeStore ? window.CafeStore.getReservations() : []);
      return;
    }

    fetch(BACKEND_URL + '/api/admin/reservations', {
      credentials: 'include',
      headers: apiHeaders()
    })
      .then(function (r) {
        if (handleUnauthorized(r)) return [];
        return r.ok ? r.json() : [];
      })
      .then(function (items) {
        drawReservationRows(items || []);
      })
      .catch(function () {
        drawReservationRows([]);
        toast('Could not load reservations from backend.', 'error');
      });
  }

  function drawReservationRows(reservations) {
    if (!resTableBody) return;
    resTableBody.innerHTML = '';
    if (!reservations || reservations.length === 0) {
      resTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">No table reservations received yet.</td></tr>';
      return;
    }

    reservations.forEach(function (res) {
      var statusClass = res.status === 'Confirmed' ? 'badge-success'
        : res.status === 'Cancelled' ? 'badge-danger'
        : res.status === 'Completed' ? 'badge-info'
        : 'badge-warning';
      var emailSent = res.emailSent || res.email_sent
        ? '<span title="Email sent" style="color:#10b981;">✉</span> '
        : '';
      var created = res.createdAt || res.created_at || res.created || '';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong class="mono">' + safe(res.id) + '</strong><br>' + emailSent +
          '<small style="color:#94a3b8;font-size:11px;">' + safe(created) + '</small></td>' +
        '<td><strong>' + safe(res.name) + '</strong><br><small style="color:#64748b;">' + safe(res.phone) + '</small></td>' +
        '<td>' + safe(res.date) + '<br><small style="color:#64748b;">' + safe(res.time) + '</small></td>' +
        '<td>' + (res.guests || 2) + ' Guests</td>' +
        '<td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          (res.notes ? safe(res.notes) : '<span style="color:#94a3b8;">None</span>') + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + safe(res.status || 'Pending') + '</span></td>' +
        '<td>' +
          '<div style="display:flex;gap:5px;flex-wrap:wrap;">' +
            '<button class="btn-admin btn-admin-secondary" style="padding:4px 8px;font-size:12px;" data-res-action="confirm" data-id="' + safeAttr(res.id) + '">✓</button>' +
            '<button class="btn-admin btn-admin-secondary" style="padding:4px 8px;font-size:12px;" data-res-action="cancel" data-id="' + safeAttr(res.id) + '">✕</button>' +
            '<button class="btn-admin btn-admin-danger" style="padding:4px 8px;font-size:12px;" data-res-action="delete" data-id="' + safeAttr(res.id) + '">🗑</button>' +
          '</div>' +
        '</td>';
      resTableBody.appendChild(tr);
    });
  }

  /* ---------- TABLE EVENT DELEGATION: MENU ---------- */
  if (menuTableBody) {
    menuTableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');

      if (action === 'toggle-stock') {
        apiPatch(BACKEND_URL + '/api/admin/menu/' + id + '/toggle-stock', null, function () {
          toast('Stock status updated.', 'success');
          renderAll();
        });
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this menu item?')) {
          apiDelete(BACKEND_URL + '/api/admin/menu/' + id, function () {
            toast('Menu item deleted.', 'success');
            renderAll();
          });
        }
      } else if (action === 'edit') {
        openItemModal(id);
      }
    });
  }

  function apiPatch(url, body, onSuccess) {
    if (!canUseAdminApi()) {
      toast('Please sign in to manage the menu.', 'error');
      return;
    }
    fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: apiHeaders(),
      body: body ? JSON.stringify(body) : undefined
    })
      .then(function (r) {
        if (handleUnauthorized(r)) return null;
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then(function (d) { if (d && onSuccess) onSuccess(d); })
      .catch(function (err) { toast(err.message || 'Request failed.', 'error'); });
  }

  function apiDelete(url, onSuccess) {
    if (!canUseAdminApi()) {
      toast('Please sign in to manage the menu.', 'error');
      return;
    }
    fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: apiHeaders()
    })
      .then(function (r) {
        if (handleUnauthorized(r)) return null;
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then(function (d) { if (d && onSuccess) onSuccess(d); })
      .catch(function (err) { toast(err.message || 'Request failed.', 'error'); });
  }

  /* ---------- TABLE EVENT DELEGATION: RESERVATIONS ---------- */
  if (resTableBody) {
    resTableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-res-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-res-action');
      var id = btn.getAttribute('data-id');

      var STATUS_MAP = { confirm: 'Confirmed', cancel: 'Cancelled' };

      if (action === 'confirm' || action === 'cancel') {
        if (!canUseAdminApi()) {
          toast('Please sign in to manage reservations.', 'error');
          return;
        }
        fetch(BACKEND_URL + '/api/admin/reservations/' + id, {
          method: 'PATCH',
          credentials: 'include',
          headers: apiHeaders(),
          body: JSON.stringify({ status: STATUS_MAP[action] })
        })
          .then(function (r) {
            if (handleUnauthorized(r)) return null;
            if (!r.ok) throw new Error('Could not update reservation');
            return r.json();
          })
          .then(function (d) {
            if (d) {
              toast('Reservation marked as ' + STATUS_MAP[action] + '.', 'success');
              renderAll();
            }
          })
          .catch(function (err) { toast(err.message, 'error'); });
      } else if (action === 'delete') {
        if (confirm('Delete this reservation record?')) {
          apiDelete(BACKEND_URL + '/api/admin/reservations/' + id, function () {
            toast('Reservation deleted.', 'success');
            renderAll();
          });
        }
      }
    });
  }

  /* ---------- MODAL ---------- */
  function openItemModal(id) {
    if (!canUseAdminApi()) {
      toast('Please sign in to add or edit menu items.', 'error');
      return;
    }

    editingItemId = id || null;

    if (id) {
      fetch(BACKEND_URL + '/api/admin/menu', {
        credentials: 'include',
        headers: apiHeaders()
      })
        .then(function (r) {
          if (handleUnauthorized(r)) return [];
          return r.ok ? r.json() : [];
        })
        .then(function (items) {
          var item = items.find(function (m) { return m.id === id; });
          if (!item) {
            toast('Menu item not found.', 'error');
            return;
          }
          fillModal(item);
        })
        .catch(function () {
          toast('Could not load menu item from backend.', 'error');
        });
    } else {
      if (modalTitle) modalTitle.textContent = 'Add New Menu Item';
      if (itemForm) itemForm.reset();
      var instockEl = document.getElementById('field-instock');
      if (instockEl) instockEl.checked = true;
      resetUploadUi();
      updateImagePreview();
      if (itemModal) itemModal.classList.add('open');
    }
  }

  function fillModal(item) {
    if (modalTitle) modalTitle.textContent = 'Edit Menu Item';
    document.getElementById('field-name').value = item.name || '';
    document.getElementById('field-price').value = item.price || '';
    document.getElementById('field-cat').value = item.cat || 'special';
    document.getElementById('field-desc').value = item.desc || '';
    document.getElementById('field-photo').value = item.photo || '';
    document.getElementById('field-veg').checked = !!item.veg;
    document.getElementById('field-featured').checked = !!item.featured;
    var stockEl = document.getElementById('field-instock');
    if (stockEl) stockEl.checked = item.inStock !== false;
    resetUploadUi();
    updateImagePreview();
    if (itemModal) itemModal.classList.add('open');
  }

  function closeItemModal() {
    if (itemModal) itemModal.classList.remove('open');
    editingItemId = null;
  }

  function updateImagePreview() {
    var url = photoInput ? photoInput.value.trim() : '';
    if (!photoPreview) return;

    photoPreview.innerHTML = '';

    if (!url) {
      var placeholder = document.createElement('span');
      placeholder.className = 'image-preview-placeholder';
      placeholder.textContent = 'Enter an Image URL above or pick a photo from the presets below';
      photoPreview.appendChild(placeholder);
      return;
    }

    var img = document.createElement('img');
    img.alt = 'Preview';
    img.src = url;
    img.addEventListener('error', function () {
      if (photoPreview.firstChild === img) {
        photoPreview.innerHTML = '';
        var msg = document.createElement('span');
        msg.style.cssText = 'color:#ef4444;font-size:12px;padding:12px;text-align:center;';
        msg.textContent = 'Invalid image URL';
        photoPreview.appendChild(msg);
      }
    });
    photoPreview.appendChild(img);
  }


  if (photoInput) photoInput.addEventListener('input', updateImagePreview);

  /* ---------- FILE UPLOAD (resize → base64 data URL) ---------- */
  var uploadBtn = document.getElementById('btn-upload-photo');
  var uploadFileInput = document.getElementById('field-upload-file');
  var uploadHint = document.getElementById('upload-hint');

  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('Could not read that image.')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.readAsDataURL(file);
    });
  }

  function compressImage(img, maxDim, quality) {
    var width = img.naturalWidth || 0;
    var height = img.naturalHeight || 0;
    if (!width || !height) throw new Error('Could not read that image.');
    var scale = 1;
    if (width > maxDim || height > maxDim) {
      scale = maxDim / Math.max(width, height);
    }
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function resetUploadUi() {
    if (uploadFileInput) uploadFileInput.value = '';
    if (uploadHint) uploadHint.textContent = '';
  }

  if (uploadBtn && uploadFileInput) {
    uploadBtn.addEventListener('click', function () { uploadFileInput.click(); });

    uploadFileInput.addEventListener('change', function () {
      var file = uploadFileInput.files && uploadFileInput.files[0];
      if (!file) return;

      if (file.size > 8 * 1024 * 1024) {
        toast('That image is larger than 8 MB. Please choose a smaller photo.', 'error');
        resetUploadUi();
        return;
      }

      fileToImage(file).then(function (img) {
        var dataUrl = compressImage(img, 900, 0.72);
        if (photoInput) {
          photoInput.value = dataUrl;
        }
        if (uploadHint) {
          uploadHint.textContent = 'Photo attached (' + Math.round(dataUrl.length / 1024) + ' KB). Save the item to publish it.';
        }
        updateImagePreview();
      }).catch(function (err) {
        toast(err && err.message ? err.message : 'Could not process that image.', 'error');
        resetUploadUi();
      });
    });
  }

  var btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) btnAddItem.addEventListener('click', function () { openItemModal(null); });

  var modalCloseBtn = document.getElementById('modal-close');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeItemModal);

  var modalCancelBtn = document.getElementById('btn-modal-cancel');
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeItemModal);

  if (itemModal) itemModal.addEventListener('click', function (e) {
    if (e.target === itemModal) closeItemModal();
  });

  /* ---------- PRESET PHOTO PICKER (local assets + curated defaults) ---------- */
  if (presetContainer) {
    var presets = [
      { name: 'Boiled Egg', url: '../assets/food/boiled-egg.jpg' },
      { name: 'Omelette', url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80' },
      { name: 'Chana', url: '../assets/food/chana-tarkari.jpg' },
      { name: 'Chicken Burger', url: '../assets/food/burger-chicken.jpg' },
      { name: 'Double Burger', url: '../assets/food/burger-double.jpg' },
      { name: 'Buff Chowmein', url: '../assets/food/chowmein-buff.jpg' },
      { name: 'Chicken Chowmein', url: '../assets/food/chowmein-chicken.jpg' },
      { name: 'Veg Chowmein', url: '../assets/food/chowmein-veg.jpg' },
      { name: 'Coke', url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80' },
      { name: 'Cold Coffee', url: '../assets/food/cold-coffee.jpg' },
      { name: 'Fanta', url: '../assets/food/fanta-orange.jpg' },
      { name: 'Sprite', url: '../assets/food/sprite.jpg' },
      { name: 'Red Bull 220ml', url: '../assets/food/redbull-can.jpg' },
      { name: 'Red Bull 330ml', url: '../assets/food/redbull-cans.jpg' },
      { name: 'Hookah Cloud', url: '../assets/cloud-hookah.jpg' },
      { name: 'Hookah Classic', url: '../assets/cloud-hookah.jpg' },
      { name: 'Banana Lassi', url: '../assets/special-lassi.jpg' },
      { name: 'Sweet Lassi', url: '../assets/special-lassi.jpg' },
      { name: 'Plain Lassi', url: '../assets/food/lassi-plain.jpg' },
      { name: 'Kurkure Momo', url: '../assets/kurkure-momo.jpg' },
      { name: 'Steam Momo', url: '../assets/food/momo-steam-chicken.jpg' },
      { name: 'Steam Buff Momo', url: '../assets/food/momo-steam-buff.jpg' },
      { name: 'Chicken Lollipop', url: '../assets/food/chicken-lollipop.jpg' },
      { name: 'Cigarette Pack', url: '../assets/food/cigarettes-pack-1.jpg' },
      { name: 'Cigarette Pack 2', url: '../assets/food/cigarettes-pack-2.jpg' },
      { name: 'Butterfly Tea', url: '../assets/butterfly-pea-tea.jpg' },
      { name: 'Egg Burger', url: '../assets/food/egg-burger.jpg' },
      { name: 'Grilled Sausage', url: '../assets/food/sausage-grill.jpg' },
      { name: 'Noodles Sadheko', url: '../assets/food/noodles-sadheko.jpg' },
      { name: 'Peanut Sadheko', url: '../assets/food/peanut-sadheko.jpg' },
      { name: 'Chilli Momo', url: '../assets/food/momo-chilli.jpg' },
      { name: 'Peach Iced Tea', url: '../assets/food/peach-iced.jpg' },
      { name: 'Black Tea', url: '../assets/food/black-tea.jpg' },
      { name: 'Hot Lemon', url: '../assets/food/hot-lemon.jpg' },
      { name: 'Hot Lemon Honey', url: '../assets/food/hot-lemon-honey.jpg' },
      { name: 'Lemon Tea', url: '../assets/food/lemon-tea.jpg' },
      { name: 'Honey Ginger', url: '../assets/food/honey-ginger-tea.jpg' },
      { name: 'Peach Tea', url: '../assets/food/peach-tea.jpg' },
      { name: 'Xtreme', url: '../assets/food/xtreme-energy.jpg' },
      { name: 'Masala Tea', url: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=600&q=80' },
      { name: 'Coffee', url: '../assets/artisanal-coffee.jpg' }
    ];

    var html = presets.map(function (p) {
      return '<button type="button" class="preset-photo-btn" data-preset="' + safeAttr(p.url) + '" title="' + safeAttr(p.name) + '">' +
        '<img src="' + safeAttr(p.url) + '" alt="' + safeAttr(p.name) + '" loading="lazy">' +
        '<span>' + safe(p.name) + '</span></button>';
    }).join('');

    presetContainer.innerHTML = html;

    presetContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-preset]');
      if (!btn) return;
      if (photoInput) photoInput.value = btn.getAttribute('data-preset');
      updateImagePreview();
    });
  }

  /* ---------- ITEM FORM SUBMIT ---------- */
  if (itemForm) {
    itemForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!canUseAdminApi()) {
        toast('Please sign in to save menu items.', 'error');
        return;
      }

      var name = document.getElementById('field-name').value.trim();
      var price = parseFloat(document.getElementById('field-price').value);
      var cat = document.getElementById('field-cat').value;
      var desc = document.getElementById('field-desc').value.trim();
      var photo = document.getElementById('field-photo').value.trim();
      var veg = document.getElementById('field-veg').checked;
      var featured = document.getElementById('field-featured').checked;
      var inStock = document.getElementById('field-instock').checked;

      if (!name || isNaN(price) || !cat) {
        toast('Please complete item title, price, and category.', 'error');
        return;
      }

      var itemData = {
        name: name, price: price, cat: cat, desc: desc, photo: photo,
        veg: veg, featured: featured, inStock: inStock
      };

      if (editingItemId) {
        fetch(BACKEND_URL + '/api/admin/menu/' + editingItemId, {
          method: 'PUT',
          credentials: 'include',
          headers: apiHeaders(),
          body: JSON.stringify(itemData)
        })
          .then(function (r) {
            if (handleUnauthorized(r)) return null;
            if (!r.ok) {
              return r.json().then(function (d) { throw new Error(d.error || 'Could not save item'); });
            }
            return r.json();
          })
          .then(function (saved) {
            if (saved) {
              toast('Menu item updated.', 'success');
              closeItemModal();
              renderAll();
            }
          })
          .catch(function (err) {
            toast(err.message || 'Could not save item.', 'error');
          });
      } else {
        fetch(BACKEND_URL + '/api/admin/menu', {
          method: 'POST',
          credentials: 'include',
          headers: apiHeaders(),
          body: JSON.stringify(itemData)
        })
          .then(function (r) {
            if (handleUnauthorized(r)) return null;
            if (!r.ok) {
              return r.json().then(function (d) { throw new Error(d.error || 'Could not create item'); });
            }
            return r.json();
          })
          .then(function (saved) {
            if (saved) {
              toast('Menu item created.', 'success');
              closeItemModal();
              renderAll();
            }
          })
          .catch(function (err) {
            toast(err.message || 'Could not create item.', 'error');
          });
      }
    });
  }

  /* ---------- RESET BUTTON (removed for security: demo reset disabled) ---------- */
  var btnResetData = document.getElementById('btn-reset-data');
  if (btnResetData) {
    btnResetData.style.display = 'none';
  }

  /* ---------- SIDEBAR / SECTION NAV ---------- */
  var navItems = document.querySelectorAll('.admin-nav-item');
  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      navItems.forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
      var targetId = item.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- RENDER ALL ---------- */
  function renderAll() {
    updateStats();
    renderAdminMenu();
    renderAdminReservations();
  }

  // Listen for auth state changes and store updates
  window.addEventListener('admin-auth-state-changed', renderAll);
  window.addEventListener('cafe_store_updated', renderAll);
  window.addEventListener('admin-reservations-refreshed', renderAll);

  // Force a first render after the auth check settles.
  setTimeout(renderAll, 300);

  /* ---------- INITIAL BOOT ---------- */
  renderAll();
})();

