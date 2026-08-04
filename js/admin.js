/* ==========================================================================
   BREW BUTTERFLY CAFE — ADMIN DASHBOARD LOGIC
   Integrates with backend API when available; falls back to localStorage.
   ========================================================================== */

(function () {
  'use strict';

  var BACKEND_URL  = 'https://brew-butterfly-cafe-1.onrender.com';
  var TOKEN_KEY    = 'bbc_admin_jwt';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }

  function apiHeaders(extra) {
    return Object.assign({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (getToken() || '')
    }, extra || {});
  }

  // ── Elements ────────────────────────────────────────────────────────────────
  var statsItemsCount = document.getElementById('stat-items-count');
  var statsResCount   = document.getElementById('stat-res-count');
  var statsCatCount   = document.getElementById('stat-cat-count');
  var statsPendingRes = document.getElementById('stat-pending-res');
  var menuTableBody   = document.getElementById('admin-menu-tbody');
  var resTableBody    = document.getElementById('admin-res-tbody');
  var itemModal       = document.getElementById('item-modal');
  var itemForm        = document.getElementById('item-form');
  var modalTitle      = document.getElementById('modal-title');
  var photoInput      = document.getElementById('field-photo');
  var photoPreview    = document.getElementById('photo-preview');
  var editingItemId   = null;

  // ── Stats ───────────────────────────────────────────────────────────────────
  function updateStats() {
    var token = getToken();
    if (token) {
      fetch(BACKEND_URL + '/api/admin/stats', { headers: apiHeaders() })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          if (statsItemsCount) statsItemsCount.textContent = d.totalMenuItems;
          if (statsResCount)   statsResCount.textContent   = d.totalReservations;
          if (statsPendingRes) statsPendingRes.textContent = d.pendingReservations;
        })
        .catch(function () { updateStatsLocal(); });
    } else {
      updateStatsLocal();
    }
    if (statsCatCount) statsCatCount.textContent = 12;
  }

  function updateStatsLocal() {
    var menu         = window.CafeStore ? window.CafeStore.getMenu() : [];
    var reservations = window.CafeStore ? window.CafeStore.getReservations() : [];
    var pending      = reservations.filter(function (r) { return r.status === 'Pending'; });
    if (statsItemsCount) statsItemsCount.textContent = menu.length;
    if (statsResCount)   statsResCount.textContent   = reservations.length;
    if (statsPendingRes) statsPendingRes.textContent = pending.length;
  }

  // ── MENU TABLE ──────────────────────────────────────────────────────────────
  function renderAdminMenu() {
    if (!menuTableBody) return;
    menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Loading…</td></tr>';

    var token = getToken();
    var p = token
      ? fetch(BACKEND_URL + '/api/admin/menu', { headers: apiHeaders() }).then(function (r) { return r.ok ? r.json() : null; })
      : Promise.resolve(null);

    p.then(function (items) {
      if (!items) items = window.CafeStore ? window.CafeStore.getMenu() : [];
      drawMenuRows(items);
    }).catch(function () {
      drawMenuRows(window.CafeStore ? window.CafeStore.getMenu() : []);
    });
  }

  function catName(catId) {
    var names = {
      special: 'Special Menu', momo: 'Momo', chowmein: 'Chowmein',
      burger: 'Burger', 'tea-coffee': 'Tea & Coffee', 'cold-drinks': 'Cold Drinks',
      hookah: 'Hookah', lassi: 'Lassi', breakfast: 'Breakfast', snacks: 'Snacks',
      energy: 'Energy Drink', cigarettes: 'Cigarettes'
    };
    return names[catId] || catId;
  }

  function drawMenuRows(menu) {
    if (!menuTableBody) return;
    menuTableBody.innerHTML = '';
    if (!menu || menu.length === 0) {
      menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No menu items found. Click "+ Add New Menu Item".</td></tr>';
      return;
    }
    menu.forEach(function (item) {
      var photo    = item.photo || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=100&q=80';
      var inStock  = (item.inStock !== undefined ? item.inStock : item.in_stock);
      var stockBadge = inStock
        ? '<span class="badge badge-success" style="cursor:pointer;" data-action="toggle-stock" data-id="' + item.id + '">In Stock</span>'
        : '<span class="badge badge-danger" style="cursor:pointer;" data-action="toggle-stock" data-id="' + item.id + '">Out of Stock</span>';
      var vegBadge = item.veg
        ? '<span style="color:#10b981;font-weight:600;">● Veg</span>'
        : '<span style="color:#ef4444;font-weight:600;">● Non-Veg</span>';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            '<img class="dish-thumb" src="' + safeAttr(photo) + '" alt="' + safeAttr(item.name) + '" onerror="this.src=\'https://via.placeholder.com/50\'">' +
            '<div>' +
              '<strong style="display:block;color:#1e293b;">' + safe(item.name) + '</strong>' +
              '<small style="color:#64748b;">' + (item.featured ? '⭐ Featured' : 'Standard') + '</small>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td><span class="badge badge-info">' + catName(item.cat) + '</span></td>' +
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

  // ── RESERVATIONS TABLE ──────────────────────────────────────────────────────
  function renderAdminReservations() {
    if (!resTableBody) return;
    resTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">Loading…</td></tr>';

    var token = getToken();
    var p = token
      ? fetch(BACKEND_URL + '/api/admin/reservations', { headers: apiHeaders() }).then(function (r) { return r.ok ? r.json() : null; })
      : Promise.resolve(null);

    p.then(function (items) {
      if (!items) items = window.CafeStore ? window.CafeStore.getReservations() : [];
      drawReservationRows(items);
    }).catch(function () {
      drawReservationRows(window.CafeStore ? window.CafeStore.getReservations() : []);
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
      var tr = document.createElement('tr');
      var emailSent = res.email_sent ? '<span title="Email sent" style="color:#10b981;">✉</span> ' : '';
      tr.innerHTML =
        '<td><strong class="mono">' + safe(res.id) + '</strong><br>' + emailSent + '<small style="color:#94a3b8;font-size:11px;">' + (res.created_at || res.created || '') + '</small></td>' +
        '<td><strong>' + safe(res.name) + '</strong><br><small style="color:#64748b;">' + safe(res.phone) + '</small></td>' +
        '<td>' + safe(res.date) + '<br><small style="color:#64748b;">' + safe(res.time) + '</small></td>' +
        '<td>' + (res.guests || 2) + ' Guests</td>' +
        '<td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (res.notes ? safe(res.notes) : '<span style="color:#94a3b8;">None</span>') + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + (res.status || 'Pending') + '</span></td>' +
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

  // ── TABLE EVENT DELEGATION ──────────────────────────────────────────────────
  if (menuTableBody) {
    menuTableBody.addEventListener('click', function (e) {
      var btn    = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id     = btn.getAttribute('data-id');
      var token  = getToken();

      if (action === 'toggle-stock') {
        if (token) {
          fetch(BACKEND_URL + '/api/admin/menu/' + id + '/toggle-stock', {
            method: 'PATCH', headers: apiHeaders()
          }).then(function () { renderAll(); }).catch(function () {
            if (window.CafeStore) { window.CafeStore.toggleStock(id); renderAll(); }
          });
        } else {
          if (window.CafeStore) { window.CafeStore.toggleStock(id); renderAll(); }
        }
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this menu item?')) {
          if (token) {
            fetch(BACKEND_URL + '/api/admin/menu/' + id, {
              method: 'DELETE', headers: apiHeaders()
            }).then(function () {
              if (window.CafeStore) window.CafeStore.deleteMenuItem(id);
              renderAll();
            }).catch(function () {
              if (window.CafeStore) { window.CafeStore.deleteMenuItem(id); renderAll(); }
            });
          } else {
            if (window.CafeStore) { window.CafeStore.deleteMenuItem(id); renderAll(); }
          }
        }
      } else if (action === 'edit') {
        openItemModal(id);
      }
    });
  }

  if (resTableBody) {
    resTableBody.addEventListener('click', function (e) {
      var btn    = e.target.closest('[data-res-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-res-action');
      var id     = btn.getAttribute('data-id');
      var token  = getToken();

      var STATUS_MAP = { confirm: 'Confirmed', cancel: 'Cancelled' };

      if (action === 'confirm' || action === 'cancel') {
        var newStatus = STATUS_MAP[action];
        if (token) {
          fetch(BACKEND_URL + '/api/admin/reservations/' + id, {
            method: 'PATCH', headers: apiHeaders(),
            body: JSON.stringify({ status: newStatus })
          }).then(function () {
            if (window.CafeStore) window.CafeStore.updateReservationStatus(id, newStatus);
            renderAll();
          }).catch(function () {
            if (window.CafeStore) { window.CafeStore.updateReservationStatus(id, newStatus); renderAll(); }
          });
        } else {
          if (window.CafeStore) { window.CafeStore.updateReservationStatus(id, newStatus); renderAll(); }
        }
      } else if (action === 'delete') {
        if (confirm('Delete this reservation record?')) {
          if (token) {
            fetch(BACKEND_URL + '/api/admin/reservations/' + id, {
              method: 'DELETE', headers: apiHeaders()
            }).then(function () {
              if (window.CafeStore) window.CafeStore.deleteReservation(id);
              renderAll();
            }).catch(function () {
              if (window.CafeStore) { window.CafeStore.deleteReservation(id); renderAll(); }
            });
          } else {
            if (window.CafeStore) { window.CafeStore.deleteReservation(id); renderAll(); }
          }
        }
      }
    });
  }

  // ── MODAL ───────────────────────────────────────────────────────────────────
  function openItemModal(id) {
    editingItemId = id || null;
    if (editingItemId) {
      var item = window.CafeStore ? window.CafeStore.getMenuItemById(editingItemId) : null;
      if (item) {
        if (modalTitle) modalTitle.textContent = 'Edit Menu Item';
        document.getElementById('field-name').value      = item.name;
        document.getElementById('field-price').value     = item.price;
        document.getElementById('field-cat').value       = item.cat;
        document.getElementById('field-desc').value      = item.desc || '';
        document.getElementById('field-photo').value     = item.photo || '';
        document.getElementById('field-veg').checked     = !!item.veg;
        document.getElementById('field-featured').checked = !!item.featured;
        document.getElementById('field-instock').checked = item.inStock !== false;
      }
    } else {
      if (modalTitle) modalTitle.textContent = 'Add New Menu Item';
      if (itemForm) itemForm.reset();
      var instockEl = document.getElementById('field-instock');
      if (instockEl) instockEl.checked = true;
    }
    updateImagePreview();
    if (itemModal) itemModal.classList.add('open');
  }

  function closeItemModal() {
    if (itemModal) itemModal.classList.remove('open');
    editingItemId = null;
  }

  function updateImagePreview() {
    var url = photoInput ? photoInput.value.trim() : '';
    if (url && photoPreview) {
      photoPreview.innerHTML = '<img src="' + safeAttr(url) + '" onerror="this.parentNode.innerHTML=\'<span style=color:#ef4444;font-size:12px;>Invalid image URL</span>\'">';
    } else if (photoPreview) {
      photoPreview.innerHTML = '<span class="image-preview-placeholder">Enter an Image URL above to see live preview</span>';
    }
  }

  if (photoInput) photoInput.addEventListener('input', updateImagePreview);

  var btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) btnAddItem.addEventListener('click', function () { openItemModal(null); });

  var modalCloseBtn = document.getElementById('modal-close');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeItemModal);

  var modalCancelBtn = document.getElementById('btn-modal-cancel');
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeItemModal);

  // Close on backdrop click
  if (itemModal) itemModal.addEventListener('click', function (e) {
    if (e.target === itemModal) closeItemModal();
  });

  if (itemForm) {
    itemForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name    = document.getElementById('field-name').value.trim();
      var price   = parseFloat(document.getElementById('field-price').value);
      var cat     = document.getElementById('field-cat').value;
      var desc    = document.getElementById('field-desc').value.trim();
      var photo   = document.getElementById('field-photo').value.trim();
      var veg     = document.getElementById('field-veg').checked;
      var featured = document.getElementById('field-featured').checked;
      var inStock = document.getElementById('field-instock').checked;

      if (!name || isNaN(price) || !cat) {
        alert('Please complete item title, price, and category.');
        return;
      }

      var itemData = { id: editingItemId, name: name, price: price, cat: cat, desc: desc, photo: photo, veg: veg, featured: featured, inStock: inStock };
      var token    = getToken();

      var apiCall;
      if (token) {
        if (editingItemId) {
          apiCall = fetch(BACKEND_URL + '/api/admin/menu/' + editingItemId, {
            method: 'PUT', headers: apiHeaders(), body: JSON.stringify(itemData)
          });
        } else {
          apiCall = fetch(BACKEND_URL + '/api/admin/menu', {
            method: 'POST', headers: apiHeaders(), body: JSON.stringify(itemData)
          });
        }
      } else {
        apiCall = Promise.reject(new Error('offline'));
      }

      apiCall.then(function (r) {
        if (r && r.ok) return r.json();
        throw new Error('API error');
      }).then(function (saved) {
        if (window.CafeStore) window.CafeStore.saveMenuItem(saved.id ? saved : itemData);
        closeItemModal();
        renderAll();
      }).catch(function () {
        // Fallback: save to localStorage only
        if (window.CafeStore) window.CafeStore.saveMenuItem(itemData);
        closeItemModal();
        renderAll();
      });
    });
  }

  // ── PRESET PHOTO PICKER ─────────────────────────────────────────────────────
  var presetContainer = document.getElementById('preset-photos');
  if (presetContainer) {
    var presets = [
      { name: 'Coffee',   url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80' },
      { name: 'Tea',      url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80' },
      { name: 'Momo',     url: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80' },
      { name: 'Chowmein', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80' },
      { name: 'Burger',   url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
      { name: 'Hookah',   url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80' },
      { name: 'Lassi',    url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80' },
      { name: 'Snack',    url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80' }
    ];
    presetContainer.innerHTML = presets.map(function (p) {
      return '<button type="button" style="padding:4px 10px;font-size:12px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;" data-preset="' + safeAttr(p.url) + '">' + p.name + '</button>';
    }).join(' ');
    presetContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-preset]');
      if (btn) { if (photoInput) photoInput.value = btn.getAttribute('data-preset'); updateImagePreview(); }
    });
  }

  // ── RESET BUTTON ────────────────────────────────────────────────────────────
  var btnResetData = document.getElementById('btn-reset-data');
  if (btnResetData) {
    btnResetData.addEventListener('click', function () {
      if (confirm('Reset menu and reservations back to default cafe data?')) {
        if (window.CafeStore) window.CafeStore.resetDefaults();
        renderAll();
      }
    });
  }

  // ── SIDEBAR NAV ACTIVE STATE ─────────────────────────────────────────────────
  var navItems = document.querySelectorAll('.admin-nav-item');
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      navItems.forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
    });
  });

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  function safe(str) {
    var div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }
  function safeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── RENDER ALL ───────────────────────────────────────────────────────────────
  function renderAll() {
    updateStats();
    renderAdminMenu();
    renderAdminReservations();
  }

  // Listen for localStorage store updates
  window.addEventListener('cafe_store_updated', renderAll);

  // ── INITIAL BOOT ─────────────────────────────────────────────────────────────
  renderAll();
   

})();
