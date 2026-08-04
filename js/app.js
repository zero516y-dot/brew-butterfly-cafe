/* ==========================================================================
   BREW BUTTERFLY CAFE â€” MAIN PUBLIC APP LOGIC
   ========================================================================== */

(function(){
  "use strict";

  // Cache elements
  var loader = document.getElementById('loader');
  var tabsEl = document.getElementById('tabs-scroll');
  var panelsEl = document.getElementById('menu-panels');
  var noResults = document.getElementById('no-results');
  var menuSearch = document.getElementById('menu-search');
  var showcaseTrack = document.getElementById('showcase-track');
  var galleryGrid = document.getElementById('gallery-grid');
  var reviewsList = document.getElementById('reviews-list');
  var ratingBars = document.getElementById('rating-bars');

  /* ---------- LOADER HIDER ---------- */
  function hideLoader(){
    if(loader) loader.classList.add('hide');
  }
  window.addEventListener('load', function(){ setTimeout(hideLoader, 800); });
  setTimeout(hideLoader, 2500);

  /* ---------- ICON SVG HELPER ---------- */
  function icon(id){
    return '<svg viewBox="0 0 24 24" fill="none"><use href="#' + id + '"/></svg>';
  }

  /* ---------- RENDER DYNAMIC MENU FROM STORE ---------- */
  function renderMenu(){
    if (!tabsEl || !panelsEl) return;

    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '';

    var categories = window.CafeStore.getCategories();
    var menuItems = window.CafeStore.getMenu();

    var activeTabSlug = '';

    categories.forEach(function(cat){
      var itemsInCat = menuItems.filter(function(item){ return item.cat === cat.id; });
      if (itemsInCat.length === 0) return; // Hide empty categories

      var isFirst = !activeTabSlug;
      if (isFirst) activeTabSlug = cat.id;

      // Create category tab
      var tab = document.createElement('button');
      tab.className = 'tab-btn' + (isFirst ? ' active' : '');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('data-panel', cat.id);
      tab.innerHTML = icon(cat.icon) + '<span>' + cat.name + '</span>';
      tabsEl.appendChild(tab);

      // Create panel
      var panel = document.createElement('div');
      panel.className = 'menu-panel' + (isFirst ? ' active' : '');
      panel.id = 'panel-' + cat.id;

      var cardsHtml = itemsInCat.map(function(item){
        var vegTag = item.veg ?
          '<div class="mc-veg-tag" title="Vegetarian"><span></span></div>' :
          '<div class="mc-veg-tag mc-nonveg-tag" title="Non-Vegetarian"><span></span></div>';

        var outStockClass = item.inStock ? '' : ' mc-out-stock';
        var stockBadge = item.inStock ? '' : '<span class="mc-badge-tag" style="background:#e74c3c">Sold Out</span>';
        var featuredBadge = (item.featured && item.inStock) ? '<span class="mc-badge-tag">Popular</span>' : '';

        var photoUrl = item.photo || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80';

        return '<div class="menu-card' + outStockClass + '" data-name="' + item.name.toLowerCase() + '" data-cat="' + cat.id + '">\n' +
          '  <div class="mc-photo-wrap">\n' +
          '    <img class="mc-photo" src="' + photoUrl + '" alt="' + item.name + '" loading="lazy">\n' +
          '    ' + featuredBadge + stockBadge + vegTag + '\n' +
          '  </div>\n' +
          '  <div class="mc-body">\n' +
          '    <div class="mc-top">\n' +
          '      <h4>' + item.name + '</h4>\n' +
          '      <span class="mc-price">Rs ' + item.price + '</span>\n' +
          '    </div>\n' +
          '    <p class="mc-desc">' + (item.desc || '') + '</p>\n' +
          '  </div>\n' +
          '</div>';
      }).join('');

      panel.innerHTML = cardsHtml ?
        '<div class="menu-grid">' + cardsHtml + '</div>' :
        '<p style="padding:20px;color:rgba(36,31,28,0.5)">No items currently in this category.</p>';

      panelsEl.appendChild(panel);
    });

    // Re-bind tab clicks
    tabsEl.addEventListener('click', function(e){
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.menu-panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      var targetPanel = document.getElementById('panel-' + btn.getAttribute('data-panel'));
      if(targetPanel) targetPanel.classList.add('active');
      if(menuSearch) menuSearch.value = '';
      filterMenu('');
    });
  }

  /* ---------- MENU SEARCH FILTER ---------- */
  function filterMenu(query){
    query = (query || '').trim().toLowerCase();
    var anyVisible = false;
    var searching = query.length > 0;

    document.querySelectorAll('.menu-panel').forEach(function(panel){
      var items = panel.querySelectorAll('.menu-card');
      var visibleInPanel = 0;

      items.forEach(function(item){
        var match = !searching || item.getAttribute('data-name').indexOf(query) !== -1;
        item.style.display = match ? 'flex' : 'none';
        if (match) visibleInPanel++;
      });

      if (searching) {
        panel.style.display = visibleInPanel > 0 ? 'block' : 'none';
        panel.classList.toggle('active', visibleInPanel > 0);
      } else {
        panel.style.display = '';
      }

      if (visibleInPanel > 0) anyVisible = true;
    });

    if (!searching) {
      var activeTab = document.querySelector('.tab-btn.active');
      if (activeTab) {
        var slug = activeTab.getAttribute('data-panel');
        document.querySelectorAll('.menu-panel').forEach(function(p){
          p.classList.toggle('active', p.id === 'panel-' + slug);
        });
      }
      if(tabsEl) tabsEl.style.display = '';
      if(noResults) noResults.classList.remove('show');
      return;
    }

    if(tabsEl) tabsEl.style.display = 'none';
    if(noResults) noResults.classList.toggle('show', !anyVisible);
  }

  if (menuSearch) {
    menuSearch.addEventListener('input', function(e){
      filterMenu(e.target.value);
    });
  }

  /* ---------- RENDER SHOWCASE WITH AUTO-SWAP ANIMATION ---------- */
  var showcaseTimer  = null;
  var showcasePaused = false;
  var currentDotIdx  = 0;

  function renderShowcase(){
    if (!showcaseTrack) return;
    showcaseTrack.innerHTML = '';
    if (showcaseTimer) { clearInterval(showcaseTimer); showcaseTimer = null; }

    var menuItems = window.CafeStore.getMenu();
    var featured  = menuItems.filter(function(m){ return m.featured; });
    if (featured.length === 0) featured = menuItems.slice(0, 6);
    var total = featured.length;

    /* ── Build cards ── */
    featured.forEach(function(item, idx){
      var card = document.createElement('div');
      card.className = 'showcase-card';
      card.style.animationDelay = (idx * 0.08) + 's';
      var photoUrl = item.photo || 'assets/butterfly-pea-tea.jpg';

      card.innerHTML =
        '<div class="sc-visual">' +
          '<img src="' + escapeHtml(photoUrl) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
          '<span class="sc-tag">⭐ Crowd Favorite</span>' +
        '</div>' +
        '<div class="sc-body">' +
          '<h4>' + escapeHtml(item.name) + '</h4>' +
          '<p>' + escapeHtml(item.desc || '') + '</p>' +
          '<div class="sc-footer">' +
            '<span class="sc-price">Rs ' + item.price + '</span>' +
            '<button class="sc-btn btn-primary" style="padding:6px 14px;font-size:12px;" data-item="' + escapeHtml(item.name) + '">Select</button>' +
          '</div>' +
        '</div>';
      showcaseTrack.appendChild(card);
    });

    /* ── Build dot indicators ── */
    var dotsEl = document.getElementById('showcase-dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      featured.forEach(function(_, idx){
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'sc-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to item ' + (idx + 1));
        dot.addEventListener('click', function(){
          goToCard(idx);
        });
        dotsEl.appendChild(dot);
      });
    }

    /* ── Helper: scroll to a specific card index ── */
    function goToCard(idx){
      var cards = showcaseTrack.querySelectorAll('.showcase-card');
      if (!cards[idx]) return;
      currentDotIdx = idx;
      showcaseTrack.scrollTo({ left: cards[idx].offsetLeft - 32, behavior: 'smooth' });
      updateDots();
    }

    function updateDots(){
      var allDots = document.querySelectorAll('.sc-dot');
      allDots.forEach(function(d, i){ d.classList.toggle('active', i === currentDotIdx); });
    }

    /* ── Update active dot on manual scroll ── */
    showcaseTrack.addEventListener('scroll', function(){
      var cards = showcaseTrack.querySelectorAll('.showcase-card');
      var closest = 0;
      var minDist = Infinity;
      cards.forEach(function(card, i){
        var dist = Math.abs(card.offsetLeft - showcaseTrack.scrollLeft - 32);
        if (dist < minDist){ minDist = dist; closest = i; }
      });
      if (closest !== currentDotIdx){
        currentDotIdx = closest;
        updateDots();
      }
    }, { passive: true });

    /* ── Reserve-notes shortcut ── */
    showcaseTrack.addEventListener('click', function(e){
      var btn = e.target.closest('.sc-btn');
      if (!btn) return;
      var name = btn.getAttribute('data-item');
      var notes = document.getElementById('r-notes');
      if (notes){
        notes.value = notes.value ? notes.value + ', ' + name : 'Interested in ordering: ' + name;
        showToast('Added "' + name + '" to your reservation notes');
        document.getElementById('reserve').scrollIntoView({ behavior: 'smooth' });
      }
    });

    /* ── Pause on hover / touch ── */
    showcaseTrack.addEventListener('mouseenter', function(){ showcasePaused = true; });
    showcaseTrack.addEventListener('mouseleave', function(){ showcasePaused = false; });
    showcaseTrack.addEventListener('touchstart', function(){ showcasePaused = true; }, { passive: true });
    showcaseTrack.addEventListener('touchend',   function(){ setTimeout(function(){ showcasePaused = false; }, 3000); });

    /* ── Auto-swap every 2.8 s ── */
    showcaseTimer = setInterval(function(){
      if (showcasePaused) return;
      var next = (currentDotIdx + 1) % total;
      goToCard(next);
    }, 2800);

    /* ── Prev / Next arrow buttons ── */
    var btnPrev = document.getElementById('sc-prev');
    var btnNext = document.getElementById('sc-next');
    if (btnPrev) {
      btnPrev.onclick = function(){
        var prev = (currentDotIdx - 1 + total) % total;
        goToCard(prev);
      };
    }
    if (btnNext) {
      btnNext.onclick = function(){
        var next = (currentDotIdx + 1) % total;
        goToCard(next);
      };
    }
  }

  /* ---------- RENDER GALLERY ---------- */
  function renderGallery(){
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    var items = window.DEFAULT_CAFE_DATA.gallery || [];
    items.forEach(function(g, idx){
      var tile = document.createElement('div');
      tile.className = 'g-tile reveal';
      tile.style.setProperty('--i', idx);
      tile.innerHTML =
        '<img src="' + escapeHtml(g.src) + '" alt="' + escapeHtml(g.title) + '" loading="lazy">' +
        '<div class="g-tile-info">' +
          '<h4>' + escapeHtml(g.title) + '</h4>' +
          '<p>' + escapeHtml(g.desc) + '</p>' +
        '</div>';
      galleryGrid.appendChild(tile);
    });
  }

  /* ---------- 3D MENU ANIMATION ---------- */
  function init3DEffects(){
    // Initialize scroll-based 3D animations
    var observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    var animationObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe menu cards for scroll animations
    document.querySelectorAll('.menu-card').forEach(function(card) {
      card.classList.add('animate-in');
      animationObserver.observe(card);

      // Interactive 3D mouse tilt effect
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = -((y - centerY) / centerY) * 12;
        var rotateY = ((x - centerX) / centerX) * 12;
        card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px) scale(1.02)';
      });

      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
      });
    });

    // Add staggered animation to showcase items
    document.querySelectorAll('.showcase-card').forEach(function(card, index) {
      card.style.animationDelay = (index * 0.1) + 's';
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = -((y - centerY) / centerY) * 10;
        var rotateY = ((x - centerX) / centerX) * 10;
        card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
      });
    });

    // Add animation to gallery items
    document.querySelectorAll('.g-tile').forEach(function(tile, index) {
      tile.style.animationDelay = (index * 0.15) + 's';
      tile.classList.add('reveal');
    });
  }

  /* ---------- REVIEWS & BARS ---------- */
  function renderReviews(){
    if (!reviewsList) return;
    reviewsList.innerHTML = '';
    var reviews = [
      { name: "Rubina G.", initials: "RG", stars: 4, color: "var(--amber-deep)", time: "3 weeks ago", text: "Lovely atmosphere in Tejbinayak! Butterfly Pea Tea and momo combination was fantastic." },
      { name: "Saroj Y.", initials: "SY", stars: 5, color: "var(--pea)", time: "4 weeks ago", text: "Great place to hang out with friends. Service was attentive and hookah was top notch." },
      { name: "Aashish S.", initials: "AS", stars: 5, color: "var(--orchid)", time: "2 months ago", text: "Beautiful lighting and cozy seating. Highly recommended for slow evenings." }
    ];

    reviews.forEach(function(r){
      var card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            '<div style="width:40px;height:40px;border-radius:50%;background:' + r.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">' + r.initials + '</div>' +
            '<div><h5 style="margin:0;font-size:15px;">' + r.name + '</h5><span style="font-size:12px;color:rgba(0,0,0,0.5)">Verified Guest</span></div>' +
          '</div>' +
          '<div style="color:#f2c14e;font-size:14px;">' + 'â˜…'.repeat(r.stars) + '</div>' +
        '</div>' +
        '<p style="font-size:14.5px;color:rgba(36,31,28,0.75);">' + r.text + '</p>' +
        '<div style="margin-top:10px;font-size:12px;color:rgba(0,0,0,0.4);" class="mono">' + r.time + '</div>';
      reviewsList.appendChild(card);
    });

    if (ratingBars) {
      ratingBars.innerHTML = '';
      var dist = [ {s:5,c:28}, {s:4,c:10}, {s:3,c:3}, {s:2,c:1}, {s:1,c:0} ];
      var total = 42;
      dist.forEach(function(d){
        var pct = Math.round((d.c / total) * 100);
        var row = document.createElement('div');
        row.style.cssText = "display:flex;align-items:center;gap:10px;font-size:13px;font-family:'Space Mono',monospace;margin-bottom:8px;";
        row.innerHTML =
          '<span>' + d.s + 'â˜…</span>' +
          '<div style="flex:1;height:8px;background:var(--cream-dim);border-radius:10px;overflow:hidden;">' +
            '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--pea),var(--orchid));border-radius:10px;"></div>' +
          '</div>' +
          '<span>' + d.c + '</span>';
        ratingBars.appendChild(row);
      });
    }
  }

  /* ---------- EMAIL NOTIFICATION HELPER ---------- */
  // NOTE: Email sending has been moved to js/reservation.js which calls
  // the secure backend API at http://localhost:3000/api/reserve
  // This stub is kept for backward compatibility only.
  function sendEmailNotification(res) {
    console.info('[app.js] Email sending delegated to reservation.js backend API.');
    return null;
  }

  /* ---------- RESERVATION FORM ---------- */
  // Form submission is now handled by js/reservation.js (backend API + CSRF).
  // Only the date minimum is set here as a UI convenience.
  (function() {
    var dateInput = document.getElementById('r-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
  })();


  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- TOAST HELPER ---------- */
  var toastTimer;
  function showToast(msg){
    var toast = document.getElementById('toast');
    var toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 3200);
  }

  /* ---------- NAV & SCROLL REVEAL ---------- */
  var navEl = document.getElementById('site-nav');
  var backTop = document.getElementById('back-top');
  window.addEventListener('scroll', function(){
    if(navEl) navEl.classList.toggle('scrolled', window.scrollY > 40);
    if(backTop) backTop.classList.toggle('show', window.scrollY > 500);
  }, {passive: true});

  if(backTop) backTop.addEventListener('click', function(){ window.scrollTo({top:0, behavior:'smooth'}); });

  var burger = document.getElementById('burger');
  var mobilePanel = document.getElementById('mobile-panel');
  if(burger && mobilePanel){
    burger.addEventListener('click', function(){
      var open = mobilePanel.classList.toggle('open');
      burger.classList.toggle('open', open);
    });
    mobilePanel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        mobilePanel.classList.remove('open');
        burger.classList.remove('open');
      });
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, {threshold: 0.1});
  revealEls.forEach(function(el){ io.observe(el); });

  // Listen for Store changes from Admin panel
  window.addEventListener('cafe_store_updated', function(){
    renderMenu();
    renderShowcase();
    init3DEffects();
  });

  function observeReveals(){
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  }

  // Initial Boot
  renderMenu();
  renderShowcase();
  renderGallery();
  renderReviews();
  observeReveals();
  setTimeout(init3DEffects, 100);

})();
