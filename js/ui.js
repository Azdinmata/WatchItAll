const UI = {
  createPosterCard(item, options = {}) {
    if (!item.poster_path) return null;

    const { mediaType, showBookmark = true, showSeason = false, progress = null } = options;
    const type = mediaType || item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const posterUrl = TMDB.getPosterUrl(item.poster_path, 'medium');
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const isBookmarked = AppState.isBookmarked(item.id, type);

    const card = document.createElement('div');
    card.className = 'poster-card';
    card.dataset.id = item.id;
    card.dataset.type = type;

    if (showBookmark) {
      const btn = document.createElement('button');
      btn.className = `bookmark-btn${isBookmarked ? ' active' : ''}`;
      btn.innerHTML = isBookmarked ? '&#9733;' : '&#9734;';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const added = AppState.toggleBookmark({ ...item, media_type: type });
        btn.innerHTML = added ? '&#9733;' : '&#9734;';
        btn.classList.toggle('active', added);
      });
      card.appendChild(btn);
    }

    const img = document.createElement('img');
    img.className = 'poster-img';
    img.src = posterUrl;
    img.alt = title;
    img.loading = 'lazy';
    img.width = 180;
    img.height = 270;
    card.appendChild(img);

    if (showSeason && item.number_of_seasons) {
      const overlay = document.createElement('div');
      overlay.className = 'season-overlay';
      overlay.textContent = `${item.number_of_seasons} Season${item.number_of_seasons > 1 ? 's' : ''}`;
      card.appendChild(overlay);
    }

    if (progress !== null) {
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.style.width = `${Math.min(progress, 100)}%`;
      card.appendChild(bar);
    }

    const info = document.createElement('div');
    info.className = 'poster-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'poster-title';
    titleEl.textContent = title;
    info.appendChild(titleEl);

    const meta = document.createElement('div');
    meta.className = 'poster-meta';

    if (rating) {
      const badge = document.createElement('span');
      badge.className = 'rating-badge';
      badge.textContent = `\u2605 ${rating}`;
      meta.appendChild(badge);
    }

    if (year) {
      const yr = document.createElement('span');
      yr.textContent = year;
      meta.appendChild(yr);
    }

    info.appendChild(meta);
    card.appendChild(info);

    card.addEventListener('click', () => {
      AppState.addToHistory({ ...item, media_type: type });
      window.location.hash = `#detail/${type}/${item.id}`;
    });

    return card;
  },

  renderCarousel(container, items, options = {}) {
    container.innerHTML = '';
    items.forEach(item => {
      const card = this.createPosterCard(item, options);
      if (card) container.appendChild(card);
    });
    this.addScrollArrows(container);
  },

  renderGrid(container, items, options = {}) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="empty-state">No results found.</p>';
      return;
    }
    items.forEach(item => {
      const card = this.createPosterCard(item, options);
      if (card) container.appendChild(card);
    });
  },

  showLoading(sectionId) {
    const el = document.getElementById(`${sectionId}-loading`);
    if (el) el.classList.remove('hidden');
  },

  hideLoading(sectionId) {
    const el = document.getElementById(`${sectionId}-loading`);
    if (el) el.classList.add('hidden');
  },

  populateSelect(selectId, items, valueKey = 'id', labelKey = 'name') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = `<option value="">All ${selectId.includes('genre') ? 'Genres' : ''}</option>`;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[valueKey];
      opt.textContent = item[labelKey];
      select.appendChild(opt);
    });
    select.value = currentVal;
    this.syncCustomSelect(select);
  },

  populateSidebar(section, genres) {
    const sublist = document.querySelector(`.nav-group a[data-section="${section}"] + .nav-sublist`);
    if (!sublist) return;

    const allLink = document.createElement('a');
    allLink.href = `#${section}`;
    allLink.className = 'nav-subitem active';
    allLink.dataset.filter = 'all';
    allLink.textContent = 'All Categories';
    allLink.addEventListener('click', (e) => {
      AppState.setFilter(section === 'movies' ? 'movies' : 'series', 'genre', '');
      const sel = document.querySelector(`#section-${section} #${section}-genre`);
      if (sel) { sel.value = ''; this.syncCustomSelect(sel); }
      const sectionObj = section === 'movies' ? MoviesSection : SeriesSection;
      sectionObj.currentPage = 1;
      sectionObj.load();
    });

    sublist.innerHTML = '';
    sublist.appendChild(allLink);

    genres.forEach(g => {
      const a = document.createElement('a');
      a.href = `#${section}`;
      a.className = 'nav-subitem';
      a.dataset.filter = g.id;
      a.textContent = g.name;
      a.addEventListener('click', (e) => {
        AppState.setFilter(section === 'movies' ? 'movies' : 'series', 'genre', String(g.id));
        const sel = document.querySelector(`#section-${section} #${section}-genre`);
        if (sel) { sel.value = g.id; this.syncCustomSelect(sel); }
        const sectionObj = section === 'movies' ? MoviesSection : SeriesSection;
        sectionObj.currentPage = 1;
        sectionObj.load();
      });
      sublist.appendChild(a);
    });
  },

  initCustomSelects(section) {
    document.querySelectorAll(`#section-${section} .filter-select`).forEach(el => this.customSelect(el));
  },

  customSelect(selectEl) {
    if (selectEl.dataset.customSelect) return;
    selectEl.dataset.customSelect = 'true';
    selectEl.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.className = 'custom-select-trigger';
    trigger.type = 'button';
    trigger.textContent = selectEl.options[selectEl.selectedIndex]?.textContent || '';
    wrapper.appendChild(trigger);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';
    wrapper.appendChild(optionsContainer);

    const renderOptions = () => {
      optionsContainer.innerHTML = '';
      Array.from(selectEl.options).forEach(opt => {
        const el = document.createElement('div');
        el.className = 'custom-select-option';
        if (opt.selected) el.classList.add('active');
        el.textContent = opt.textContent;
        el.dataset.value = opt.value;
        optionsContainer.appendChild(el);
      });
    };
    renderOptions();

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach(s => s !== wrapper && s.classList.remove('open'));
      wrapper.classList.toggle('open');
    });

    optionsContainer.addEventListener('click', (e) => {
      const optEl = e.target.closest('.custom-select-option');
      if (!optEl) return;
      trigger.textContent = optEl.textContent;
      selectEl.value = optEl.dataset.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      wrapper.classList.remove('open');
    });

    document.addEventListener('click', () => {
      wrapper.classList.remove('open');
    }, { capture: true });

    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
  },

  syncCustomSelect(selectEl) {
    if (!selectEl.dataset.customSelect) return;
    const wrapper = selectEl.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains('custom-select')) return;
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optsContainer = wrapper.querySelector('.custom-select-options');
    if (trigger) {
      trigger.textContent = selectEl.options[selectEl.selectedIndex]?.textContent || '';
    }
    if (optsContainer) {
      optsContainer.innerHTML = '';
      Array.from(selectEl.options).forEach(opt => {
        const el = document.createElement('div');
        el.className = 'custom-select-option';
        if (opt.selected) el.classList.add('active');
        el.textContent = opt.textContent;
        el.dataset.value = opt.value;
        optsContainer.appendChild(el);
      });
    }
  },

  addScrollArrows(container) {
    if (container.dataset.scrollArrows) return;
    container.dataset.scrollArrows = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-arrow-wrapper';
    container.parentNode.insertBefore(wrapper, container);
    wrapper.appendChild(container);

    const scrollAmount = () => container.clientWidth * 0.6;

    const left = document.createElement('button');
    left.className = 'scroll-arrow scroll-arrow-left';
    left.innerHTML = '<i class="fas fa-chevron-left"></i>';
    left.addEventListener('click', () => {
      container.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });

    const right = document.createElement('button');
    right.className = 'scroll-arrow scroll-arrow-right';
    right.innerHTML = '<i class="fas fa-chevron-right"></i>';
    right.addEventListener('click', () => {
      container.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    wrapper.appendChild(left);
    wrapper.appendChild(right);

    const hide = (el) => el.style.display = 'none';
    const show = (el) => el.style.display = 'flex';

    hide(left);
    hide(right);

    container.scrollLeft = 0;

    const update = () => {
      const overflow = container.scrollWidth - container.clientWidth;
      if (overflow <= 1) {
        hide(left);
        hide(right);
        return;
      }
      const atStart = container.scrollLeft <= 10;
      const atEnd = container.scrollLeft >= overflow - 10;
      hide(left);
      hide(right);
      if (!atStart) show(left);
      if (!atEnd) show(right);
    };

    const throttledUpdate = this.throttle(update, 100);

    const scheduleUpdate = () => {
      requestAnimationFrame(update);
      setTimeout(update, 80);
      setTimeout(update, 300);
    };

    container.addEventListener('scroll', throttledUpdate);
    window.addEventListener('resize', throttledUpdate);
    const ro = new ResizeObserver(throttledUpdate);
    ro.observe(wrapper);
    const mo = new MutationObserver(throttledUpdate);
    mo.observe(container, { childList: true, subtree: true });
    scheduleUpdate();
  },

  throttle(fn, limit = 100) {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  },

  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  renderGridPage(container, items, options = {}) {
    items.forEach(item => {
      const card = this.createPosterCard(item, options);
      if (card) container.appendChild(card);
    });
  },

  createPaginationBar(currentPage, hasMore, onPrev, onNext) {
    const bar = document.createElement('div');
    bar.className = 'pagination-bar';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '\u25C0 Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', onPrev);

    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `Page ${currentPage}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next \u25B6';
    nextBtn.disabled = !hasMore;
    nextBtn.addEventListener('click', onNext);

    bar.appendChild(prevBtn);
    bar.appendChild(info);
    bar.appendChild(nextBtn);
    return bar;
  },
};
