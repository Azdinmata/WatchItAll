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
      UI.populateSelect('series-genre', genres);
      UI.populateSidebar('series', genres);
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
