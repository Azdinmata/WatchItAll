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
    window.scrollTo({ top: document.getElementById('section-movies').offsetTop - 60, behavior: 'smooth' });
  },

  prevPage() {
    if (this.currentPage <= 1) return;
    this.currentPage--;
    this.load();
    window.scrollTo({ top: document.getElementById('section-movies').offsetTop - 60, behavior: 'smooth' });
  },
};
