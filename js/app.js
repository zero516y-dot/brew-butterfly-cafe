

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

  // Live menu served from the backend (admin edits). Falls back to the
  // static seed when the backend is unreachable.
  var remoteMenu = null;

  function currentMenuItems() {
    if (remoteMenu && remoteMenu.length) return remoteMenu;
    return window.CafeStore.getMenu();
  }

  /* ---------- MOTION PREFERENCES ---------- */
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- SCROLL REVEAL OBSERVER (shared) ---------- */
  var animationObserver = null;
  if ('IntersectionObserver' in window) {
    animationObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  }

  /* ---------- LOADER HIDER ---------- */
  function hideLoader(){
    if(loader) loader.classList.add('hide');
  }
  window.addEventListener('load', function(){ setTimeout(hideLoader, 800); });
  setTimeout(hideLoader, 2500);

  /* ---------- IMAGE FALLBACK (never show a broken photo) ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.dataset.fbk) return;
    img.dataset.fbk = '1';
    img.src = 'assets/cafe-vibe.jpg';
  }, true);

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
    var menuItems = currentMenuItems();

    var activeTabSlug = '';

    categories.forEach(function(cat){
      var itemsInCat = menuItems.filter(function(item){ return item.cat === cat.id; });
      if (itemsInCat.length === 0) return; // Hide empty categories

      var isFirst = !activeTabSlug;
      if (isFirst) activeTabSlug = cat.id;

      // Create category tab (names set via textContent = XSS-safe)
      var tab = document.createElement('button');
      tab.className = 'tab-btn' + (isFirst ? ' active' : '');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('data-panel', cat.id);
      tab.innerHTML = icon(cat.icon);
      var tabLabel = document.createElement('span');
      tabLabel.textContent = cat.name;
      tab.appendChild(tabLabel);
      tabsEl.appendChild(tab);

      // Create panel
      var panel = document.createElement('div');
      panel.className = 'menu-panel' + (isFirst ? ' active' : '');
      panel.id = 'panel-' + cat.id;

      var grid = document.createElement('div');
      grid.className = 'menu-grid';

      itemsInCat.forEach(function(item){
        var photoUrl = item.photo || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80';

        var card = document.createElement('div');
        card.className = 'menu-card' + (item.inStock ? '' : ' mc-out-stock');
        card.setAttribute('data-name', String(item.name || '').toLowerCase());
        card.setAttribute('data-cat', cat.id);

        // Photo
        var photoWrap = document.createElement('div');
        photoWrap.className = 'mc-photo-wrap';

        var img = document.createElement('img');
        img.className = 'mc-photo';
        img.src = photoUrl;
        img.alt = String(item.name || '');
        img.loading = 'lazy';
        photoWrap.appendChild(img);

        if (item.featured && item.inStock) {
          var featuredBadge = document.createElement('span');
          featuredBadge.className = 'mc-badge-tag';
          featuredBadge.textContent = 'Popular';
          photoWrap.appendChild(featuredBadge);
        }

        if (!item.inStock) {
          var stockBadge = document.createElement('span');
          stockBadge.className = 'mc-badge-tag';
          stockBadge.style.background = '#e74c3c';
          stockBadge.textContent = 'Sold Out';
          photoWrap.appendChild(stockBadge);
        }

        var vegTag = document.createElement('div');
        vegTag.className = 'mc-veg-tag' + (item.veg ? '' : ' mc-nonveg-tag');
        vegTag.title = item.veg ? 'Vegetarian' : 'Non-Vegetarian';
        vegTag.appendChild(document.createElement('span'));
        photoWrap.appendChild(vegTag);

        card.appendChild(photoWrap);

        // Body
        var body = document.createElement('div');
        body.className = 'mc-body';

        var top = document.createElement('div');
        top.className = 'mc-top';

        var title = document.createElement('h4');
        title.textContent = String(item.name || '');
        top.appendChild(title);

        var price = document.createElement('span');
        price.className = 'mc-price';
        price.textContent = 'Rs ' + Number(item.price || 0);
        top.appendChild(price);

        body.appendChild(top);

        if (item.desc) {
          var desc = document.createElement('p');
          desc.className = 'mc-desc';
          desc.textContent = String(item.desc || '');
          body.appendChild(desc);
        }

        card.appendChild(body);
        grid.appendChild(card);
      });

      if (grid.childNodes.length === 0) {
        var emptyNote = document.createElement('p');
        emptyNote.style.cssText = 'padding:20px;color:rgba(36,31,28,0.5)';
        emptyNote.textContent = 'No items currently in this category.';
        panel.appendChild(emptyNote);
      } else {
        panel.appendChild(grid);
      }

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

    var menuItems = currentMenuItems();
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
          '<span class="sc-tag">Crowd Favorite</span>' +
        '</div>' +
        '<div class="sc-body">' +
          '<h4>' + escapeHtml(item.name) + '</h4>' +
          '<p>' + escapeHtml(item.desc || '') + '</p>' +
          '<div class="sc-footer">' +
            '<span class="sc-price">Rs ' + item.price + '</span>' +
            '<button class="sc-btn" data-item="' + escapeHtml(item.name) + '">Select</button>' +
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
  function attachTilt(selector, intensity, lift){
    document.querySelectorAll(selector).forEach(function(el){
      el.addEventListener('mouseenter', function(){
        if (prefersReduced) return;
        el.classList.add('tilt-active');
        el.style.transform = 'perspective(900px) translateY(' + (-(lift || 6)) + 'px)';
      });
      el.addEventListener('mousemove', function(e){
        if (prefersReduced) return;
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform =
          'perspective(900px) rotateX(' + (-y * intensity).toFixed(2) + 'deg) rotateY(' +
          (x * intensity).toFixed(2) + 'deg) translateY(' + (-(lift || 6)) + 'px)';
      });
      el.addEventListener('mouseleave', function(){
        el.style.transform = '';
        el.classList.remove('tilt-active');
      });
    });
  }

  function init3DEffects(){
    // Gentle fade-up entrance for menu cards when they scroll into view
    document.querySelectorAll('.menu-card').forEach(function(card){
      card.classList.add('animate-in');
      if (animationObserver) {
        animationObserver.observe(card);
      } else {
        card.classList.add('visible');
      }
    });

    // Refined, low-intensity tilt (Premium personality — no fighting transitions)
    attachTilt('.menu-card', 5, 8);
    attachTilt('.showcase-card', 4, 8);
    attachTilt('.testimonial-card', 4, 6);

    // Gallery tiles — reveal + stagger
    document.querySelectorAll('.g-tile').forEach(function(tile, index){
      tile.style.animationDelay = (index * 0.12) + 's';
    });

    // Delegated tilt for dynamically re-rendered review cards
    document.addEventListener('mouseenter', function(e){
      var card = e.target && e.target.closest ? e.target.closest('.review-card') : null;
      if (!card || prefersReduced) return;
      card.classList.add('tilt-active');
      card.style.transform = 'perspective(900px) translateY(-5px)';
    }, true);
    document.addEventListener('mousemove', function(e){
      var card = e.target && e.target.closest ? e.target.closest('.review-card') : null;
      if (!card || prefersReduced) return;
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' +
        (x * 4).toFixed(2) + 'deg) translateY(-5px)';
    });
    document.addEventListener('mouseleave', function(e){
      var card = e.target && e.target.closest ? e.target.closest('.review-card') : null;
      if (!card) return;
      card.style.transform = '';
      card.classList.remove('tilt-active');
    }, true);
  }

  /* ---------- HERO PARALLAX (mouse + scroll, composed) ---------- */
  function initHeroParallax() {
    var heroEl = document.getElementById('home');
    if (!heroEl) return;

    var butterfly = document.getElementById('hero-butterfly');
    var glow1 = heroEl.querySelector('.glow1');
    var glow2 = heroEl.querySelector('.glow2');
    var bg = heroEl.querySelector('.hero-bg-photo');

    var offset = { nx: 0, ny: 0, scrollY: 0 };

    function applyMotion() {
      if (prefersReduced) return;
      if (butterfly) butterfly.style.translate = (offset.nx * -34) + 'px ' + (offset.ny * -26 + offset.scrollY * 0.3) + 'px';
      if (glow1) glow1.style.translate = (offset.nx * 26) + 'px ' + (offset.ny * 18 + offset.scrollY * 0.14) + 'px';
      if (glow2) glow2.style.translate = (offset.nx * -20) + 'px ' + (offset.ny * -14 + offset.scrollY * -0.1) + 'px';
      if (bg) bg.style.backgroundPosition = '50% ' + (50 + offset.scrollY * 0.12) + '%';
    }

    heroEl.addEventListener('mousemove', function (e) {
      var rect = heroEl.getBoundingClientRect();
      offset.nx = (e.clientX - rect.left) / rect.width - 0.5;
      offset.ny = (e.clientY - rect.top) / rect.height - 0.5;
      applyMotion();
    });

    window.addEventListener('scroll', function () {
      if (window.scrollY < window.innerHeight * 1.2) {
        offset.scrollY = window.scrollY;
        applyMotion();
      }
    }, { passive: true });
  }

  /* ---------- REVIEWS & BARS ---------- */
  var reviewFallback = {
    rating: 4.0,
    reviewCount: 16,
    ratingDistribution: { '5': 8, '4': 4, '3': 1, '2': 1, '1': 2 },
    reviews: [
      {
        name: 'Saroj Yonjan',
        initials: 'SY',
        stars: 5,
        time: 'a month ago',
        text: 'Good service'
      },
      {
        name: 'Aashish Shrestha',
        initials: 'AS',
        stars: 5,
        time: '2 months ago',
        text: 'Beautiful place'
      }
    ]
  };

  function initialsOf(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    var first = (parts[0] || '?').charAt(0);
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  function starsString(n) {
    var clamped = Math.max(0, Math.min(5, Math.round(n || 0)));
    return '\u2605'.repeat(clamped) + '\u2606'.repeat(5 - clamped);
  }

  function updateRatingSummary(data) {
    var num = document.getElementById('rating-num');
    var starsEl = document.getElementById('rating-stars');
    var count = document.getElementById('rating-count');
    var heroStars = document.querySelector('#hero-rating .stars');
    var heroText = document.getElementById('hero-rating-text');

    var value = Number(data.rating);
    var rounded = isFinite(value) ? value.toFixed(1) : '4.0';

    if (num) num.textContent = rounded;
    if (starsEl) starsEl.textContent = starsString(value);
    if (count) count.textContent = data.reviewCount;
    if (heroStars) heroStars.textContent = starsString(value);
    if (heroText) heroText.textContent = rounded + ' Rating (' + data.reviewCount + ' Google Reviews)';
  }

  function renderRatingBars(distribution, total) {
    if (!ratingBars) return;
    ratingBars.innerHTML = '';

    [5, 4, 3, 2, 1].forEach(function (s) {
      var c = distribution && distribution[s] ? distribution[s] : 0;
      var pct = total > 0 ? Math.round((c / total) * 100) : 0;

      var row = document.createElement('div');
      row.className = 'rating-bar-row';

      var label = document.createElement('span');
      label.className = 'mono';
      label.textContent = s + '\u2605';
      row.appendChild(label);

      var bar = document.createElement('div');
      bar.className = 'rating-bar';
      var fill = document.createElement('div');
      fill.className = 'rating-bar-fill';
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      row.appendChild(bar);

      var countEl = document.createElement('span');
      countEl.className = 'mono';
      countEl.textContent = c;
      row.appendChild(countEl);

      ratingBars.appendChild(row);
    });
  }

  function renderReviewCards(reviews) {
    if (!reviewsList) return;
    reviewsList.innerHTML = '';

    var palette = ['var(--pea)', 'var(--orchid)', 'var(--amber)', 'var(--pea-deep)', 'var(--orchid-bright)'];

    (reviews || []).forEach(function (r, i) {
      var card = document.createElement('div');
      card.className = 'review-card';

      var header = document.createElement('div');
      header.className = 'review-card-header';

      var identity = document.createElement('div');
      identity.className = 'review-card-identity';

      var avatar = document.createElement('div');
      avatar.className = 'review-card-avatar';
      avatar.style.background = palette[i % palette.length];
      avatar.textContent = r.initials || initialsOf(r.name || r.author);
      identity.appendChild(avatar);

      var meta = document.createElement('div');
      var nameEl = document.createElement('h5');
      nameEl.textContent = r.name || r.author || 'Google reviewer';
      var source = document.createElement('span');
      source.className = 'review-card-source';
      source.textContent = 'Google Maps review';
      meta.appendChild(nameEl);
      meta.appendChild(source);
      identity.appendChild(meta);
      header.appendChild(identity);

      var starsEl = document.createElement('div');
      starsEl.className = 'review-card-stars';
      starsEl.textContent = starsString(r.stars);
      starsEl.setAttribute('aria-label', r.stars + ' out of 5 stars');
      header.appendChild(starsEl);
      card.appendChild(header);

      var text = document.createElement('p');
      text.className = 'review-card-text';
      text.textContent = r.text || 'No written review.';
      card.appendChild(text);

      var time = document.createElement('div');
      time.className = 'review-card-time mono';
      time.textContent = r.time || 'recently';
      card.appendChild(time);

      reviewsList.appendChild(card);
    });
  }

  function renderReviewsData(data) {
    if (!data) return;
    var dist = data.ratingDistribution || {};
    var total = data.reviewCount || 0;
    if (!total || Object.keys(dist).length === 0) {
      total = (data.reviews || []).length;
    }
    updateRatingSummary(data);
    renderRatingBars(dist, total);
    renderReviewCards(data.reviews);
  }

  function loadLiveReviews() {
    var backendUrl;
    try {
      backendUrl = window.getBrewButterflyBackendUrl && window.getBrewButterflyBackendUrl();
    } catch (e) {
      backendUrl = '';
    }
    if (!backendUrl) return;

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 6000);

    fetch(backendUrl + '/api/public/reviews', {
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('Bad status ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || typeof data.rating !== 'number') return;
      renderReviewsData(data);
    }).catch(function () {
      // Live fetch failed — the fallback already rendered stays visible.
    }).finally(function () {
      clearTimeout(timer);
    });
  }

  function renderReviews() {
    renderReviewsData(reviewFallback);
    loadLiveReviews();
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

  /* ---------- COUNT-UP NUMBERS ---------- */
  function animateCount(el){
    if (!el) return;
    var raw = el.getAttribute('data-count');
    var target = raw != null ? Number(raw) : (parseFloat(el.textContent) || 0);
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = raw != null
      ? Number(el.getAttribute('data-decimals') || 0)
      : Number(el.getAttribute('data-decimals') || 1);

    if (prefersReduced || isNaN(target)) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }

    var dur = 1400;
    var t0 = null;
    function step(ts){
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var countEls = document.querySelectorAll('.hero-meta .num[data-count], #rating-num');
  if ('IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    countEls.forEach(function (el) { countObserver.observe(el); });
  } else {
    countEls.forEach(animateCount);
  }

  /* ---------- BACK TO TOP ---------- */
  var toTopBtn = document.getElementById('back-to-top');
  if (toTopBtn) {
    toTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- NAV & SCROLL REVEAL ---------- */
  var navEl = document.getElementById('site-nav');
  var navLinks = document.querySelectorAll('nav.links a[href^="#"]');
  var spySections = ['home', 'about', 'menu', 'gallery', 'reviews', 'location'];

  function setActiveNav(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id);
    });
  }

  window.addEventListener('scroll', function(){
    if(navEl) navEl.classList.toggle('scrolled', window.scrollY > 40);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    }
    if (toTopBtn) toTopBtn.classList.toggle('show', window.scrollY > 600);

    var current = 'home';
    spySections.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 130) current = id;
    });
    setActiveNav(current);
  }, {passive: true});

  /* ---------- SCROLL PROGRESS BAR ---------- */
  var progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressBar);

  var burger = document.getElementById('burger');
  var mobilePanel = document.getElementById('mobile-panel');
  function setMobileMenu(open){
    if (!mobilePanel || !burger) return;
    mobilePanel.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    document.body.classList.toggle('lock', open);
  }
  if(burger && mobilePanel){
    burger.addEventListener('click', function(){
      setMobileMenu(!mobilePanel.classList.contains('open'));
    });
    mobilePanel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ setMobileMenu(false); });
    });
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape') setMobileMenu(false);
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

  // Fallback — never leave content hidden when IO is unavailable
  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  // Listen for Store changes from Admin panel
  window.addEventListener('cafe_store_updated', function(){
    renderMenu();
    renderShowcase();
    init3DEffects();
  });

  function observeReveals(){
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  }

  /* ---------- LIVE MENU (admin edits appear automatically) ---------- */
  var menuSignature = '';

  function backendBaseUrl(){
    try {
      var url = window.getBrewButterflyBackendUrl && window.getBrewButterflyBackendUrl();
      if (url) return url;
    } catch (e) { /* fall through */ }
    return 'https://brew-butterfly-cafe-1.onrender.com';
  }

  // Cheap fingerprint — enough to detect admin edits without hashing the
  // full (potentially base64-heavy) payload on every poll.
  function menuSignatureOf(items){
    return (items || []).map(function(m){
      var p = String(m.photo || '');
      return [m.id, m.name, m.price, p.length, p.slice(0, 12), p.slice(-8),
        m.inStock, m.featured, m.veg, m.cat, (m.desc || '').length].join('|');
    }).join('~');
  }

  function applyRemoteMenu(items){
    var sig = menuSignatureOf(items);
    if (sig === menuSignature) return false;
    menuSignature = sig;
    remoteMenu = items;
    renderMenu();
    renderShowcase();
    init3DEffects();
    return true;
  }

  function fetchRemoteMenu(){
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 8000);

    return fetch(backendBaseUrl() + '/api/menu', {
      signal: controller ? controller.signal : undefined
    }).then(function(res){
      clearTimeout(timer);
      if (!res.ok) throw new Error('Bad status ' + res.status);
      return res.json();
    }).then(function(items){
      if (Array.isArray(items) && items.length) applyRemoteMenu(items);
      return true;
    }).catch(function(){
      clearTimeout(timer);
      return false;
    });
  }

  // Initial fetch on load, then lightweight polling so admin photo updates
  // flow through to the menu without a manual refresh.
  fetchRemoteMenu();
  setInterval(fetchRemoteMenu, 45000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') fetchRemoteMenu();
  });
  window.addEventListener('focus', function () { fetchRemoteMenu(); });

  // Initial Boot
  renderMenu();
  renderShowcase();
  renderGallery();
  renderReviews();
  observeReveals();
  setTimeout(init3DEffects, 100);
  setTimeout(initHeroParallax, 100);

})();
