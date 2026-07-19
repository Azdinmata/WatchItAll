const UI = {
  createPosterCard(item, options = {}) {
    if (!item.poster_path) return null;

    const { mediaType, showBookmark = true, showSeason = false, progress = null } = options;
    const type = mediaType || item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const posterUrl = TMDB.getPosterUrl(item.poster_path, 'small');
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
    img.decoding = 'async';
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
    const defaultLabel = selectId.includes('genre') ? 'Genre'
      : selectId.includes('language') ? 'Language'
      : selectId.includes('rating') ? 'Rating'
      : selectId.includes('year') ? 'Year' : 'All';
    select.innerHTML = `<option value="">${defaultLabel}</option>`;
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

    const scheduleUpdate = () => {
      requestAnimationFrame(update);
      setTimeout(update, 80);
      setTimeout(update, 300);
    };

    const throttledUpdate = this.throttle(update, 100);

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
const HomeSection = {
  async init() {
    this.refresh();
  },

  async refresh() {
    this.loadCarousel('[data-type="movie"][data-endpoint="top_rated"]', 'movie', 'top_rated', 'Top Rated Movies');
    this.loadCarousel('[data-type="tv"][data-endpoint="top_rated"]', 'tv', 'top_rated', 'Top Rated Series');
    this.loadCarousel('[data-type="movie"][data-endpoint="now_playing"]', 'movie', 'now_playing', 'Newest Movies');
    this.loadCarousel('[data-type="tv"][data-endpoint="on_the_air"]', 'tv', 'on_the_air', 'Newest Series');
  },

  async loadCarousel(selector, type, endpoint, label) {
    const container = document.querySelector(selector);
    if (!container) return;

    try {
      const data = await TMDB.getLatest(type, endpoint);
      const items = (data.results || []).slice(0, 20);
      UI.renderCarousel(container, items, { mediaType: type });
    } catch (e) {
      console.error(`Failed to load ${label}:`, e);
      container.innerHTML = '<p class="empty-state">Failed to load. Check your TMDB API key.</p>';
    }
  },
};
const MoviesSection = {
  allItems: [],
  currentPage: 1,
  hasMore: true,
  isLoading: false,
  loadId: 0,
  justReset: false,
  debouncedSearch: null,
  observer: null,

  async init() {
    this.debouncedSearch = UI.debounce(() => {
      this.currentPage = 1;
      this.load();
    });

    await this.loadGenres();
    this.populateYearSelect('movie-year');
    this.bindEvents();
    UI.initCustomSelects('movies');
    this.setupInfiniteScroll();
    this.load();
  },

  async loadGenres() {
    try {
      const genres = await TMDB.getGenres('movie');
      UI.populateSelect('movie-genre', genres);
      UI.populateSidebar('movies', genres);
    } catch (e) {
      console.error('Failed to load movie genres:', e);
    }
  },

  populateYearSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    }
  },

  bindEvents() {
    document.getElementById('movie-search').addEventListener('input', () => {
      AppState.setFilter('movies', 'search', document.getElementById('movie-search').value);
      this.debouncedSearch();
    });

    ['movie-genre', 'movie-language', 'movie-rating', 'movie-year'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        const key = id.replace('movie-', '');
        AppState.setFilter('movies', key, document.getElementById(id).value);
        this.currentPage = 1;
        this.justReset = true;
        this.load();
      });
    });
  },

  setupInfiniteScroll() {
    this.observer = new IntersectionObserver((entries) => {
      if (this.justReset) return;
      if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
        this.nextPage();
      }
    }, { rootMargin: '200px' });

    const sentinel = document.getElementById('movie-loading');
    if (sentinel) this.observer.observe(sentinel);
  },

  async load() {
    if (this.isLoading) return;
    this.isLoading = true;
    const id = ++this.loadId;
    UI.showLoading('movie');
    this.justReset = false;

    const grid = document.getElementById('movie-grid');
    const pagination = document.getElementById('movie-pagination');

    try {
      const filters = AppState.filters.movies;
      const hasFilters = filters.search || filters.genre || filters.language || filters.rating || filters.year;
      const needsFetch = hasFilters || this.allItems.length < this.currentPage * CONFIG.PAGE_SIZE;

      if (needsFetch) {
        if (hasFilters) this.allItems = [];
        const needed = this.currentPage * CONFIG.PAGE_SIZE;

        if (filters.search) {
          const result = await TMDB.searchAllUpTo('movie', filters.search, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        } else if (filters.genre || filters.language || filters.rating || filters.year) {
          const params = {};
          if (filters.genre) params.with_genres = filters.genre;
          if (filters.language) params.with_original_language = filters.language;
          if (filters.rating) params['vote_average.gte'] = filters.rating;
          if (filters.year) params.primary_release_year = filters.year;
          const result = await TMDB.fetchAllUpTo('movie', params, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        } else {
          const result = await TMDB.fetchAllUpTo('movie', { sort_by: 'popularity.desc' }, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        }
      }

      if (id !== this.loadId) {
        this.isLoading = false;
        UI.hideLoading('movie');
        return;
      }

      grid.innerHTML = '';
      const start = (this.currentPage - 1) * CONFIG.PAGE_SIZE;
      const pageItems = this.allItems.slice(start, start + CONFIG.PAGE_SIZE);
      if (pageItems.length === 0) {
        grid.innerHTML = '<p class="empty-state">No results found.</p>';
      } else {
        UI.renderGridPage(grid, pageItems, { mediaType: 'movie' });
      }

      const canGoNext = this.hasMore || this.allItems.length > this.currentPage * CONFIG.PAGE_SIZE;
      pagination.innerHTML = '';
      const bar = UI.createPaginationBar(
        this.currentPage,
        canGoNext,
        () => this.prevPage(),
        () => this.nextPage()
      );
      pagination.appendChild(bar);

    } catch (e) {
      console.error('Movie load error:', e);
      grid.innerHTML = '<p class="empty-state">Failed to load movies.</p>';
      pagination.innerHTML = '';
    }

    UI.hideLoading('movie');
    this.isLoading = false;
  },

  nextPage() {
    if (!this.hasMore && this.allItems.length <= this.currentPage * CONFIG.PAGE_SIZE) return;
    this.currentPage++;
    this.load();
    window.scrollTo({ top: document.getElementById('section-movies').offsetTop - 60, behavior: 'instant' });
  },

  prevPage() {
    if (this.currentPage <= 1) return;
    this.currentPage--;
    this.load();
    window.scrollTo({ top: document.getElementById('section-movies').offsetTop - 60, behavior: 'instant' });
  },
};
const SeriesSection = {
  allItems: [],
  currentPage: 1,
  hasMore: true,
  isLoading: false,
  loadId: 0,
  justReset: false,
  debouncedSearch: null,
  observer: null,

  async init() {
    this.debouncedSearch = UI.debounce(() => {
      this.currentPage = 1;
      this.load();
    });

    await this.loadGenres();
    this.populateYearSelect('series-year');
    this.bindEvents();
    UI.initCustomSelects('series');
    this.setupInfiniteScroll();
    this.load();
  },

  async loadGenres() {
    try {
      const genres = await TMDB.getGenres('tv');
      const splitGenres = [];
      const splitMap = { 'Action & Adventure': ['Action', 'Adventure'], 'Sci-Fi & Fantasy': ['Sci-Fi', 'Fantasy'], 'War & Politics': ['War', 'Politics'] };
      genres.forEach(g => {
        const names = splitMap[g.name];
        if (names) {
          names.forEach(n => splitGenres.push({ id: g.id, name: n }));
        } else {
          splitGenres.push(g);
        }
      });
      UI.populateSelect('series-genre', splitGenres);
      UI.populateSidebar('series', splitGenres);
    } catch (e) {
      console.error('Failed to load series genres:', e);
    }
  },

  populateYearSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    }
  },

  bindEvents() {
    document.getElementById('series-search').addEventListener('input', () => {
      AppState.setFilter('series', 'search', document.getElementById('series-search').value);
      this.debouncedSearch();
    });

    ['series-genre', 'series-language', 'series-rating', 'series-year'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        const key = id.replace('series-', '');
        AppState.setFilter('series', key, document.getElementById(id).value);
        this.currentPage = 1;
        this.justReset = true;
        this.load();
      });
    });
  },

  setupInfiniteScroll() {
    this.observer = new IntersectionObserver((entries) => {
      if (this.justReset) return;
      if (entries[0].isIntersecting && !this.isLoading && this.hasMore) {
        this.nextPage();
      }
    }, { rootMargin: '200px' });

    const sentinel = document.getElementById('series-loading');
    if (sentinel) this.observer.observe(sentinel);
  },

  async load() {
    if (this.isLoading) return;
    this.isLoading = true;
    const id = ++this.loadId;
    UI.showLoading('series');
    this.justReset = false;

    const grid = document.getElementById('series-grid');
    const pagination = document.getElementById('series-pagination');

    try {
      const filters = AppState.filters.series;
      const hasFilters = filters.search || filters.genre || filters.language || filters.rating || filters.year;
      const needsFetch = hasFilters || this.allItems.length < this.currentPage * CONFIG.PAGE_SIZE;

      if (needsFetch) {
        if (hasFilters) this.allItems = [];
        const needed = this.currentPage * CONFIG.PAGE_SIZE;

        if (filters.search) {
          const result = await TMDB.searchAllUpTo('tv', filters.search, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        } else if (filters.genre || filters.language || filters.rating || filters.year) {
          const params = {};
          if (filters.genre) params.with_genres = filters.genre;
          if (filters.language) params.with_original_language = filters.language;
          if (filters.rating) params['vote_average.gte'] = filters.rating;
          if (filters.year) params.first_air_date_year = filters.year;
          const result = await TMDB.fetchAllUpTo('tv', params, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        } else {
          const result = await TMDB.fetchAllUpTo('tv', { sort_by: 'popularity.desc' }, needed);
          this.allItems = result.items;
          this.hasMore = result.hasMore;
        }
      }

      if (id !== this.loadId) {
        this.isLoading = false;
        UI.hideLoading('series');
        return;
      }

      grid.innerHTML = '';
      const start = (this.currentPage - 1) * CONFIG.PAGE_SIZE;
      const pageItems = this.allItems.slice(start, start + CONFIG.PAGE_SIZE);
      if (pageItems.length === 0) {
        grid.innerHTML = '<p class="empty-state">No results found.</p>';
      } else {
        UI.renderGridPage(grid, pageItems, { mediaType: 'tv', showSeason: true });
      }

      const canGoNext = this.hasMore || this.allItems.length > this.currentPage * CONFIG.PAGE_SIZE;
      pagination.innerHTML = '';
      const bar = UI.createPaginationBar(
        this.currentPage,
        canGoNext,
        () => this.prevPage(),
        () => this.nextPage()
      );
      pagination.appendChild(bar);

    } catch (e) {
      console.error('Series load error:', e);
      grid.innerHTML = '<p class="empty-state">Failed to load series.</p>';
      pagination.innerHTML = '';
    }

    UI.hideLoading('series');
    this.isLoading = false;
  },

  nextPage() {
    if (!this.hasMore && this.allItems.length <= this.currentPage * CONFIG.PAGE_SIZE) return;
    this.currentPage++;
    this.load();
    window.scrollTo({ top: document.getElementById('section-series').offsetTop - 60, behavior: 'instant' });
  },

  prevPage() {
    if (this.currentPage <= 1) return;
    this.currentPage--;
    this.load();
    window.scrollTo({ top: document.getElementById('section-series').offsetTop - 60, behavior: 'instant' });
  },
};
const LibrarySection = {
  init() {
    this.bindEvents();
    this.refresh();
  },

  refresh() {
    this.updateAuthUI();
    this.loadBookmarks();
    this.loadHistory();

    AppState.on('authChange', () => this.updateAuthUI());
    AppState.on('bookmarksChange', () => this.loadBookmarks());
    AppState.on('historyChange', () => this.loadHistory());
  },

  bindEvents() {
    document.querySelectorAll('.lib-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.lib-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`library-${target}`).classList.add('active');
      });
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      AppState.setAuth({
        loggedIn: true,
        user: { username, email, password, avatar: '' }
      });
      this.populateSettings();
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      AppState.setAuth({
        loggedIn: true,
        user: { username: email.split('@')[0], email, password, avatar: '' }
      });
      this.populateSettings();
    });

    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const user = AppState.auth.user;
      if (!user) return;
      const username = document.getElementById('settings-username').value || user.username;
      const email = document.getElementById('settings-email').value || user.email;
      const password = document.getElementById('settings-password').value || user.password;
      AppState.setAuth({
        loggedIn: true,
        user: { ...user, username, email, password }
      });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      AppState.logout();
    });

    document.getElementById('avatar-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const user = AppState.auth.user;
        if (user) {
          AppState.setAuth({ loggedIn: true, user: { ...user, avatar: dataUrl } });
          this.updateAvatar(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  updateAuthUI() {
    const loggedOut = document.getElementById('account-logged-out');
    const loggedIn = document.getElementById('account-logged-in');
    const { auth } = AppState;

    if (auth.loggedIn && auth.user) {
      loggedOut.classList.add('hidden');
      loggedIn.classList.remove('hidden');
      this.populateSettings();
    } else {
      loggedOut.classList.remove('hidden');
      loggedIn.classList.add('hidden');
    }
  },

  populateSettings() {
    const user = AppState.auth.user;
    if (!user) return;
    document.getElementById('settings-username').value = user.username || '';
    document.getElementById('settings-email').value = user.email || '';
    document.getElementById('settings-password').value = '';
    if (user.avatar) {
      this.updateAvatar(user.avatar);
    }
  },

  updateAvatar(dataUrl) {
    const img = document.getElementById('avatar-img');
    const placeholder = document.getElementById('avatar-placeholder');
    img.src = dataUrl;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
  },

  loadBookmarks() {
    const grid = document.getElementById('bookmarks-grid');
    const empty = document.getElementById('bookmarks-empty');
    const items = AppState.bookmarks;

    if (items.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    UI.renderGrid(grid, items, { showBookmark: false });
  },

  loadHistory() {
    const grid = document.getElementById('history-grid');
    const empty = document.getElementById('history-empty');
    const items = AppState.history;

    if (items.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    UI.renderGrid(grid, items, { showBookmark: true, progress: 50 });
  },
};
const DetailSection = {
  currentType: null,
  currentId: null,
  detailData: null,
  prevSection: null,

  init() {
    document.getElementById('detail-back').addEventListener('click', () => this.back());
  },

  async load(type, id) {
    this.currentType = type;
    this.currentId = id;

    const section = document.getElementById('section-detail');
    section.classList.add('active');

    document.getElementById('detail-overview').textContent = 'Loading...';
    document.getElementById('detail-tags').innerHTML = '';
    document.getElementById('detail-cast').innerHTML = '';
    document.getElementById('rec-carousel').innerHTML = '';
    const strip = document.getElementById('detail-details-strip');
    if (strip) strip.innerHTML = '';

    try {
      const [detail, credits, similar] = await Promise.all([
        TMDB.getDetail(type, id),
        TMDB.getCredits(type, id),
        TMDB.getSimilar(type, id),
      ]);

      this.detailData = detail;
      const omdbRaw = detail.imdb_id && OMDB.isAvailable()
        ? await OMDB.getByIMDBId(detail.imdb_id).catch(() => null)
        : null;
      this.render(detail, credits, similar, omdbRaw);

      if (type === 'movie') {
        document.getElementById('detail-series-module').classList.add('hidden');
        document.getElementById('rec-heading').textContent = 'Similar Movies';
      } else {
        document.getElementById('detail-series-module').classList.remove('hidden');
        document.getElementById('rec-heading').textContent = 'Similar Series';
        this.renderSeasons(detail.seasons || []);
      }
    } catch (e) {
      console.error('Detail load error:', e);
      document.getElementById('detail-content').innerHTML = '<p class="empty-state">Failed to load details.</p>';
    }
  },

  render(detail, credits, similar, omdb) {
    const type = this.currentType;
    const title = omdb?.Title || detail.title || detail.name || 'Untitled';
    const year = (omdb?.Year || detail.release_date || detail.first_air_date || '').slice(0, 4);
    const runtime = omdb?.Runtime
      ? omdb.Runtime
      : detail.runtime
        ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
        : null;
    const seasonsCount = detail.number_of_seasons
      ? `${detail.number_of_seasons} Season${detail.number_of_seasons > 1 ? 's' : ''}`
      : null;
    const posterUrl = TMDB.getPosterUrl(detail.poster_path, 'large');

    /* Title & tagline */
    document.getElementById('detail-title').textContent = title;
    const taglineEl = document.getElementById('detail-tagline');
    if (taglineEl) taglineEl.textContent = detail.tagline || '';

    /* Poster */
    const poster = document.getElementById('detail-poster');
    poster.src = posterUrl || '';
    poster.alt = title;

    /* Backdrop */
    const backdropEl = document.getElementById('detail-backdrop');
    if (detail.backdrop_path) {
      backdropEl.src = `${CONFIG.IMG_BASE}/w780${detail.backdrop_path}`;
    }

    /* Rating badge (poster column) */
    const ratingEl = document.getElementById('detail-rating-badge');
    const scoreEl = document.getElementById('detail-rating-score');
    if (omdb?.imdbRating && omdb.imdbRating !== 'N/A') {
      ratingEl.querySelector('i').className = 'fab fa-imdb';
      scoreEl.textContent = omdb.imdbRating;
    } else {
      ratingEl.querySelector('i').className = 'fas fa-star';
      scoreEl.textContent = detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A';
    }

    /* Extra ratings (Rotten Tomatoes, Metacritic) */
    const extraEl = document.getElementById('detail-ratings-extra');
    if (extraEl) {
      extraEl.innerHTML = '';
      if (omdb?.Ratings) {
        omdb.Ratings.forEach(r => {
          if (r.Source === 'Internet Movie Database') return;
          const item = document.createElement('div');
          item.className = 'detail-rating-extra-item';
          item.innerHTML = `<span class="extra-score">${r.Value}</span><span>${r.Source}</span>`;
          extraEl.appendChild(item);
        });
      }
    }

    /* Genre tags */
    const tagsEl = document.getElementById('detail-tags');
    tagsEl.innerHTML = '';
    const genreLabel = document.createElement('span');
    genreLabel.className = 'detail-genre-heading';
    genreLabel.textContent = 'Genres';
    tagsEl.appendChild(genreLabel);
    (detail.genres || []).forEach(g => this.addTag(tagsEl, g.name));
    if (detail.adult) this.addTag(tagsEl, '18+');

    /* Meta pills */
    document.getElementById('detail-pill-type').innerHTML = `<i class="fas fa-film"></i> ${type === 'movie' ? 'Movie' : 'TV Series'}`;
    document.getElementById('detail-pill-year').innerHTML = `<i class="fas fa-calendar"></i> ${year || '—'}`;

    const durationPill = document.getElementById('detail-pill-duration');
    if (type === 'movie') {
      durationPill.innerHTML = `<i class="fas fa-clock"></i> ${runtime || '—'}`;
    } else {
      durationPill.innerHTML = `<i class="fas fa-clock"></i> ${seasonsCount || '—'}`;
    }

    const langMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', zh: 'Chinese' };
    const language = omdb?.Language
      ? omdb.Language.split(', ').map(l => langMap[l.toLowerCase()] || l).join(', ')
      : (langMap[detail.original_language] || detail.original_language?.toUpperCase() || '—');
    document.getElementById('detail-pill-language').innerHTML = `<i class="fas fa-globe"></i> ${language}`;

    /* Synopsis */
    document.getElementById('detail-overview').textContent = omdb?.Plot && omdb.Plot !== 'N/A' ? omdb.Plot : (detail.overview || 'No overview available.');

    /* Cast */
    const castEl = document.getElementById('detail-cast');
    castEl.innerHTML = '';
    const castList = (credits.cast || []).slice(0, 12);
    castList.forEach(person => {
      const card = document.createElement('div');
      card.className = 'detail-cast-card';

      const photoUrl = person.profile_path
        ? `${CONFIG.IMG_BASE}/w185${person.profile_path}`
        : null;

      if (photoUrl) {
        const img = document.createElement('img');
        img.className = 'detail-cast-photo';
        img.src = photoUrl;
        img.alt = person.name;
        img.loading = 'lazy';
        img.width = 80;
        img.height = 80;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'detail-cast-photo-placeholder';
        placeholder.innerHTML = '<i class="fas fa-user"></i>';
        card.appendChild(placeholder);
      }

      const name = document.createElement('span');
      name.className = 'detail-cast-name';
      name.textContent = person.name;
      card.appendChild(name);

      if (person.character) {
        const char = document.createElement('span');
        char.className = 'detail-cast-character';
        char.textContent = person.character;
        card.appendChild(char);
      }

      castEl.appendChild(card);
    });
    if (castList.length === 0) {
      castEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No cast available</p>';
    }
    UI.addScrollArrows(castEl);

    /* Details grid */
    this.renderDetails(detail, omdb);

    /* CTA */
    const cta = document.getElementById('detail-cta');
    cta.href = `#stream/${type}/${detail.id}`;
    cta.target = '_self';

    /* Bookmark */
    const bookmarkBtn = document.getElementById('detail-bookmark');
    const isBookmarked = AppState.isBookmarked(detail.id, type);
    bookmarkBtn.innerHTML = isBookmarked
      ? '<i class="fas fa-bookmark"></i>'
      : '<i class="far fa-bookmark"></i>';
    bookmarkBtn.classList.toggle('active', isBookmarked);
    bookmarkBtn.onclick = (e) => {
      e.stopPropagation();
      const added = AppState.toggleBookmark({
        id: detail.id,
        media_type: type,
        title: detail.title || detail.name,
        poster_path: detail.poster_path,
        vote_average: detail.vote_average,
        release_date: detail.release_date || detail.first_air_date,
      });
      bookmarkBtn.innerHTML = added
        ? '<i class="fas fa-bookmark"></i>'
        : '<i class="far fa-bookmark"></i>';
      bookmarkBtn.classList.toggle('active', added);
    };

    /* Recommendations */
    this.renderRecommendations(similar.results || [], type);

    /* History */
    AppState.addToHistory({ ...detail, media_type: type });
  },

  renderDetails(detail, omdb) {
    const strip = document.getElementById('detail-details-strip');
    if (!strip) return;
    strip.innerHTML = '';

    const rows = [];

    if (omdb?.Director && omdb.Director !== 'N/A') {
      rows.push({ icon: 'fa-user', label: 'Director', value: omdb.Director });
    }
    if (omdb?.Writer && omdb.Writer !== 'N/A') {
      rows.push({ icon: 'fa-pen', label: 'Writer', value: omdb.Writer });
    }
    if (detail.status) {
      rows.push({ icon: 'fa-circle-check', label: 'Status', value: detail.status });
    }
    if (omdb?.Country && omdb.Country !== 'N/A') {
      rows.push({ icon: 'fa-map-pin', label: 'Country', value: omdb.Country });
    } else if (detail.production_countries && detail.production_countries.length > 0) {
      const countries = detail.production_countries.map(c => c.name).join(', ');
      rows.push({ icon: 'fa-map-pin', label: 'Country', value: countries });
    }
    if (omdb?.Awards && omdb.Awards !== 'N/A') {
      rows.push({ icon: 'fa-trophy', label: 'Awards', value: omdb.Awards });
    }
    if (detail.budget && detail.budget > 0) {
      rows.push({ icon: 'fa-coins', label: 'Budget', value: `$${(detail.budget / 1_000_000).toFixed(0)}M` });
    }
    if (detail.revenue && detail.revenue > 0) {
      rows.push({ icon: 'fa-chart-line', label: 'Revenue', value: `$${(detail.revenue / 1_000_000).toFixed(0)}M` });
    }
    if (detail.number_of_episodes) {
      rows.push({ icon: 'fa-list', label: 'Episodes', value: String(detail.number_of_episodes) });
    }

    if (rows.length === 0) return;

    rows.forEach(r => {
      const badge = document.createElement('span');
      badge.className = 'detail-details-badge';
      badge.innerHTML = `<i class="fas ${r.icon}"></i><span class="badge-label">${r.label}:</span><span class="badge-value">${r.value}</span>`;
      strip.appendChild(badge);
    });
  },

  addTag(container, text) {
    const span = document.createElement('span');
    span.className = 'detail-tag';
    span.innerHTML = `<i class="fas fa-tag"></i> ${text}`;
    container.appendChild(span);
  },

  getCurrentSeason() {
    const active = document.querySelector('#season-list .season-card.active');
    return active ? parseInt(active.dataset.season, 10) : 1;
  },

  renderSeasons(seasons) {
    const container = document.getElementById('season-list');
    container.innerHTML = '';
    const validSeasons = seasons.filter(s => s.season_number > 0);
    if (validSeasons.length === 0) return;

    validSeasons.forEach(season => {
      const card = document.createElement('div');
      card.className = 'season-card';
      card.dataset.season = season.season_number;

      const inner = document.createElement('div');
      inner.className = 'season-card-inner';

      const left = document.createElement('div');
      left.className = 'season-card-left';

      const posterEl = document.createElement('img');
      posterEl.className = 'season-card-poster';
      posterEl.src = TMDB.getPosterUrl(season.poster_path, 'small') || '';
      posterEl.alt = season.name || `Season ${season.season_number}`;
      posterEl.loading = 'lazy';
      posterEl.width = 60;
      posterEl.height = 90;

      const info = document.createElement('div');
      info.className = 'season-card-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'season-card-name';
      nameEl.textContent = season.name || `Season ${season.season_number}`;

      const meta = document.createElement('span');
      meta.className = 'season-card-meta';
      meta.textContent = `${season.episode_count || '?'} episodes`;

      info.appendChild(nameEl);
      info.appendChild(meta);
      left.appendChild(posterEl);
      left.appendChild(info);

      const right = document.createElement('div');
      right.className = 'season-card-right';

      const body = document.createElement('div');
      body.className = 'season-card-body';

      right.appendChild(body);

      inner.appendChild(left);
      inner.appendChild(right);
      card.appendChild(inner);

      container.appendChild(card);

      this.loadSeasonEpisodes(season.season_number, body);
    });
  },

  async loadSeasonEpisodes(seasonNum, body) {
    body.innerHTML = '<p class="season-loading">Loading...</p>';
    try {
      const data = await TMDB.getSeason(this.currentId, seasonNum);
      const episodes = data.episodes || [];
      body.innerHTML = '';
      const epRow = document.createElement('div');
      epRow.className = 'season-episode-row';
      episodes.forEach(ep => {
        const isAvailable = ep.still_path || !ep.air_date || new Date(ep.air_date) <= new Date();
        const card = document.createElement('div');
        card.className = 'episode-card' + (isAvailable ? '' : ' episode-unavailable');
        if (isAvailable) {
          card.addEventListener('click', () => {
            window.location.hash = `#stream/tv/${this.currentId}/${seasonNum}/${ep.episode_number}`;
          });
        }

        if (ep.still_path) {
          const img = document.createElement('img');
          img.className = 'episode-still';
          img.src = TMDB.getPosterUrl(ep.still_path, 'small');
          img.alt = ep.name || `Episode ${ep.episode_number}`;
          img.loading = 'lazy';
          img.width = 140;
          img.height = 79;
          card.appendChild(img);
        }

        const epInfo = document.createElement('div');
        epInfo.className = 'episode-info';

        const num = document.createElement('div');
        num.className = 'episode-number';
        num.textContent = `${ep.episode_number}`;
        epInfo.appendChild(num);

        if (isAvailable) {
          const titleEl = document.createElement('span');
          titleEl.className = 'episode-title';
          titleEl.textContent = ep.name || `Episode ${ep.episode_number}`;
          epInfo.appendChild(titleEl);

          if (ep.runtime) {
            const rt = document.createElement('span');
            rt.className = 'episode-runtime';
            rt.textContent = `${ep.runtime}m`;
            epInfo.appendChild(rt);
          }
        } else {
          const comingEl = document.createElement('span');
          comingEl.className = 'episode-coming';
          const date = ep.air_date ? new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
          comingEl.innerHTML = `<i class="fas fa-clock"></i> ${date}`;
          epInfo.appendChild(comingEl);
        }

        card.appendChild(epInfo);
        epRow.appendChild(card);
      });
      body.appendChild(epRow);

      const scrollAmount = () => epRow.clientWidth * 0.6;
      const arrowLeft = document.createElement('button');
      arrowLeft.className = 'scroll-arrow scroll-arrow-left';
      arrowLeft.innerHTML = '<i class="fas fa-chevron-left"></i>';
      arrowLeft.addEventListener('click', () => epRow.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      const arrowRight = document.createElement('button');
      arrowRight.className = 'scroll-arrow scroll-arrow-right';
      arrowRight.innerHTML = '<i class="fas fa-chevron-right"></i>';
      arrowRight.addEventListener('click', () => epRow.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));

      const updateArrows = () => {
        const overflow = epRow.scrollWidth - epRow.clientWidth;
        if (overflow <= 1) {
          arrowLeft.style.display = 'none';
          arrowRight.style.display = 'none';
          return;
        }
        arrowLeft.style.display = epRow.scrollLeft <= 5 ? 'none' : 'flex';
        arrowRight.style.display = epRow.scrollLeft >= overflow - 5 ? 'none' : 'flex';
      };

      const throttledUpdate = UI.throttle(updateArrows, 100);
      epRow.addEventListener('scroll', throttledUpdate);
      updateArrows();

      body.appendChild(arrowLeft);
      body.appendChild(arrowRight);
    } catch (e) {
      console.error('Season load error:', e);
      body.innerHTML = '<p class="empty-state">Failed to load episodes.</p>';
    }
  },

  renderRecommendations(items, type) {
    const container = document.getElementById('rec-carousel');
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = '<p class="empty-state">No recommendations available.</p>';
      return;
    }

    UI.renderCarousel(container, items, { mediaType: type });
  },

  back() {
    const target = this.prevSection || '#home';
    window.__isBack = true;
    window.location.hash = target;
  },
};
const STREAM_SERVERS = [
  {
    name: 'VidSrc',
    embed: true,
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidLink',
    embed: true,
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: 'AutoEmbed',
    embed: true,
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://autoembed.co/movie/tmdb/${id}`
        : `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    name: 'Embed.su',
    embed: true,
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'MultiEmbed',
    embed: true,
    url: (id, type, s, e, imdbId) => {
      let u = `https://multiembed.mov/?video_id=${imdbId || id}`;
      if (s) u += `&s=${s}`;
      if (e) u += `&e=${e}`;
      return u;
    },
  },
];

const StreamSection = {
  currentType: null,
  currentId: null,
  currentSeason: null,
  currentEpisode: null,
  detailData: null,
  prevHash: null,

  init() {
    document.getElementById('stream-back').addEventListener('click', () => this.back());
    document.getElementById('stream-season').addEventListener('change', (e) => {
      this.changeSeason(parseInt(e.target.value, 10));
    });
    document.getElementById('stream-episode').addEventListener('change', (e) => {
      this.changeEpisode(parseInt(e.target.value, 10));
    });
  },

  async load(type, id, season, episode) {
    this.currentType = type;
    this.currentId = id;
    this.currentSeason = season || null;
    this.currentEpisode = episode || null;

    const section = document.getElementById('section-stream');
    section.classList.add('active');

    document.getElementById('stream-player-wrap').classList.add('hidden');
    document.getElementById('stream-servers').innerHTML = '<p class="stream-loading">Loading servers...</p>';
    document.getElementById('stream-title').textContent = 'Loading...';

    try {
      const detail = await TMDB.getDetail(type, id);
      this.detailData = detail;
      this.render(detail);
      this.renderServers();
      this.loadServer(1);

      if (type === 'tv') {
        document.getElementById('stream-episode-nav').classList.remove('hidden');
        this.loadSeasonEpisodes(this.currentSeason || 1);
      } else {
        document.getElementById('stream-episode-nav').classList.add('hidden');
      }
    } catch (e) {
      console.error('Stream load error:', e);
      document.getElementById('stream-content').innerHTML = '<p class="empty-state">Failed to load.</p>';
    }
  },

  render(detail) {
    const type = this.currentType;
    const title = detail.title || detail.name || 'Untitled';
    const year = (detail.release_date || detail.first_air_date || '').slice(0, 4);
    document.getElementById('stream-title').textContent = `${title} (${year})`;
  },

  renderServers() {
    const container = document.getElementById('stream-servers');
    container.innerHTML = '';
    STREAM_SERVERS.forEach((sv, i) => {
      const btn = document.createElement('button');
      btn.className = 'stream-server-btn';
      btn.innerHTML = `<i class="fas fa-play"></i> ${sv.name}`;
      btn.addEventListener('click', () => this.loadServer(i));
      container.appendChild(btn);
    });
  },

  loadServer(index) {
    const sv = STREAM_SERVERS[index];
    const id = this.currentId;
    const type = this.currentType;
    const s = this.currentSeason || 1;
    const e = this.currentEpisode || 1;
    const imdbId = this.detailData?.imdb_id || '';
    const url = sv.url(id, type, s, e, imdbId);

    const wrap = document.getElementById('stream-player-wrap');
    const iframe = document.getElementById('stream-iframe');
    wrap.classList.remove('hidden');
    iframe.src = url;
  },

  async loadSeasonEpisodes(seasonNum) {
    this.currentSeason = seasonNum;
    const seasonSelect = document.getElementById('stream-season');
    const episodeSelect = document.getElementById('stream-episode');

    if (!this.detailData?.seasons) return;

    seasonSelect.innerHTML = '';
    const validSeasons = this.detailData.seasons.filter(s => s.season_number > 0);
    validSeasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.season_number;
      opt.textContent = s.name || `Season ${s.season_number}`;
      if (s.season_number === seasonNum) opt.selected = true;
      seasonSelect.appendChild(opt);
    });

    episodeSelect.innerHTML = '<option value="">Episode...</option>';

    try {
      const data = await TMDB.getSeason(this.currentId, seasonNum);
      const episodes = data.episodes || [];
      episodes.forEach(ep => {
        const opt = document.createElement('option');
        opt.value = ep.episode_number;
        opt.textContent = `${ep.episode_number}. ${ep.name || ''}`;
        if (ep.episode_number === (this.currentEpisode || 1)) opt.selected = true;
        episodeSelect.appendChild(opt);
      });
      if (!this.currentEpisode && episodes.length > 0) {
        this.currentEpisode = episodes[0].episode_number;
      }
    } catch (e) {
      console.error('Failed to load season:', e);
    }
  },

  changeSeason(num) {
    this.currentSeason = num;
    this.currentEpisode = null;
    document.getElementById('stream-player-wrap').classList.add('hidden');
    this.loadSeasonEpisodes(num).then(() => this.loadServer(1));
  },

  changeEpisode(num) {
    this.currentEpisode = num;
    document.getElementById('stream-player-wrap').classList.add('hidden');
    this.loadServer(1);
  },

  back() {
    document.getElementById('stream-iframe').src = '';
    document.getElementById('stream-player-wrap').classList.add('hidden');
    window.__isBack = true;
    if (this.currentType && this.currentId) {
      window.location.hash = `#detail/${this.currentType}/${this.currentId}`;
    } else {
      window.location.hash = this.prevHash || '#home';
    }
  },
};
let cachedSections = null;
let cachedNavItems = null;
const contentWrap = () => document.getElementById('content-sections');
let previousRoute = '#home';

function getSections() {
  if (!cachedSections) cachedSections = document.querySelectorAll('.content-section');
  return cachedSections;
}

function getNavItems() {
  if (!cachedNavItems) cachedNavItems = document.querySelectorAll('.bottom-nav-item, .top-nav-item');
  return cachedNavItems;
}

function clearNavCache() {
  cachedNavItems = null;
}

document.addEventListener('DOMContentLoaded', () => {
  AppState.init();

  window.addEventListener('popstate', () => {
    window.__isBack = true;
  });

  window.addEventListener('hashchange', () => {
    clearNavCache();
    navigate(window.location.hash, !window.__isBack);
    window.__isBack = false;
  });

  initTopNav();
  initThemeToggle();
  initOpacitySlider();

  document.getElementById('logo-link').addEventListener('click', () => {
    clearNavCache();
    if (window.location.hash === '#home') {
      navigate('#home', true);
    } else {
      window.location.hash = '#home';
    }
  });

  HomeSection.init();
  MoviesSection.init();
  SeriesSection.init();
  LibrarySection.init();
  DetailSection.init();
  StreamSection.init();

  navigate(window.location.hash || '#home', true);
});

function navigate(hash, refresh) {
  if (hash.startsWith('#detail/')) {
    const parts = hash.split('/');
    const type = parts[1];
    const id = parseInt(parts[2], 10);
    if (!type || isNaN(id)) { navigate('#home', true); return; }

    const currentSection = document.querySelector('.content-section.active');
    if (currentSection && !currentSection.id.startsWith('section-detail') && !currentSection.id.startsWith('section-stream')) {
      DetailSection.prevSection = '#' + currentSection.id.replace('section-', '');
      contentWrap().dataset.scrollPos = String(window.scrollY);
    }

    getSections().forEach(s => s.classList.remove('active'));
    document.getElementById('section-detail').classList.add('active');
    getNavItems().forEach(n => n.classList.remove('active'));

    DetailSection.load(type, id);
    window.scrollTo({ top: 0, behavior: 'instant' });
    previousRoute = hash;
    return;
  }

  if (hash.startsWith('#stream/')) {
    const parts = hash.split('/');
    const type = parts[1];
    const id = parseInt(parts[2], 10);
    const season = parts[3] ? parseInt(parts[3], 10) : null;
    const episode = parts[4] ? parseInt(parts[4], 10) : null;
    if (!type || isNaN(id)) { navigate('#home', true); return; }

    StreamSection.prevHash = previousRoute;

    getSections().forEach(s => s.classList.remove('active'));
    document.getElementById('section-stream').classList.add('active');
    getNavItems().forEach(n => n.classList.remove('active'));

    StreamSection.load(type, id, season, episode);
    window.scrollTo({ top: 0, behavior: 'instant' });
    previousRoute = hash;
    return;
  }

  const sectionMap = {
    '#home': 'home',
    '#movies': 'movies',
    '#series': 'series',
    '#library': 'library',
  };

  if (!hash.startsWith('#detail/') && !hash.startsWith('#stream/')) {
    const iframe = document.getElementById('stream-iframe');
    if (iframe) iframe.src = '';
  }

  const section = sectionMap[hash] || 'home';
  getSections().forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');

  getNavItems().forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.bottom-nav-item[data-section="${section}"]`);
  if (navItem) navItem.classList.add('active');
  const topNavItem = document.querySelector(`.top-nav-item[data-section="${section}"]`);
  if (topNavItem) topNavItem.classList.add('active');

  if (refresh) {
    if (section === 'movies') {
      MoviesSection.allItems = [];
      MoviesSection.currentPage = 1;
      MoviesSection.load();
    } else if (section === 'series') {
      SeriesSection.allItems = [];
      SeriesSection.currentPage = 1;
      SeriesSection.load();
    } else if (section === 'home') {
      HomeSection.refresh();
    } else if (section === 'library') {
      LibrarySection.refresh();
    }
  }

  const saved = contentWrap().dataset.scrollPos;
  if (saved) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
    });
    delete contentWrap().dataset.scrollPos;
  } else {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  previousRoute = hash;
}

function initTopNav() {
  getNavItems().forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (item.classList.contains('active')) return;
      delete contentWrap().dataset.scrollPos;
      window.location.hash = `#${section}`;
    });
  });
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  const updateIcon = () => {
    btn.innerHTML = AppState.theme === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  };
  updateIcon();
  btn.addEventListener('click', () => {
    AppState.toggleTheme();
    updateIcon();
  });
}

function initOpacitySlider() {
  const slider = document.getElementById('opacity-slider');
  slider.value = AppState.opacity[AppState.theme];

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    AppState.setOpacity(AppState.theme, val);
  });

  AppState.on('themeChange', (theme) => {
    slider.value = AppState.opacity[theme];
  });
}
