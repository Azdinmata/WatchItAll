const CONFIG = {
  TMDB_KEY: 'f75a33ed35060c5d60c4d95bbde44ed2',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p',
  POSTER_SIZES: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
  },
  CACHE_TTL: 300000,
  PAGE_SIZE: 35,
  OMDB_KEY: '45adc056',
  OMDB_BASE: 'https://www.omdbapi.com',
};
const AppState = {
  theme: 'dark',
  opacity: { dark: 0.8, light: 0.75 },
  auth: { loggedIn: false, user: null },
  filters: {
    movies: { genre: '', language: '', rating: '', year: '', search: '' },
    series: { genre: '', language: '', rating: '', year: '', search: '' },
  },
  bookmarks: [],
  history: [],

  listeners: {},

  init() {
    const saved = localStorage.getItem('watchitall_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(this, parsed);
      } catch (e) {}
    }
    this.applyTheme();
    this.applyOpacity();
  },

  save() {
    try {
      localStorage.setItem('watchitall_state', JSON.stringify({
        theme: this.theme,
        opacity: this.opacity,
        auth: this.auth,
        bookmarks: this.bookmarks,
        history: this.history,
      }));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  },

  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  },

  emit(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  },

  setTheme(theme) {
    this.theme = theme;
    this.applyTheme();
    this.applyOpacity();
    this.save();
    this.emit('themeChange', theme);
  },

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  },

  setOpacity(theme, value) {
    this.opacity[theme] = value;
    if (this.theme === theme) {
      this.applyOpacity();
    }
    this.save();
  },

  applyOpacity() {
    const val = this.opacity[this.theme];
    document.documentElement.style.setProperty('--glass-opacity', val);
  },

  setFilter(type, key, value) {
    this.filters[type][key] = value;
    this.emit('filterChange', { type, key, value });
  },

  toggleBookmark(item) {
    const idx = this.bookmarks.findIndex(b => b.id === item.id && b.media_type === item.media_type);
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
    } else {
      this.bookmarks.unshift(item);
    }
    this.save();
    this.emit('bookmarksChange', this.bookmarks);
    return idx < 0;
  },

  isBookmarked(id, media_type) {
    return this.bookmarks.some(b => b.id === id && b.media_type === media_type);
  },

  addToHistory(item) {
    const existing = this.history.findIndex(h => h.id === item.id && h.media_type === item.media_type);
    if (existing >= 0) {
      this.history.splice(existing, 1);
    }
    this.history.unshift({ ...item, watchedAt: Date.now() });
    if (this.history.length > 100) this.history.pop();
    this.save();
    this.emit('historyChange', this.history);
  },

  setAuth(authState) {
    this.auth = authState;
    this.save();
    this.emit('authChange', authState);
  },

  logout() {
    this.setAuth({ loggedIn: false, user: null });
  },
};
const TMDB = {
  cache: new Map(),
  pending: new Map(),

  async fetch(endpoint, params = {}) {
    const key = JSON.stringify({ endpoint, params });
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < CONFIG.CACHE_TTL) {
      return cached.data;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const query = new URLSearchParams({ api_key: CONFIG.TMDB_KEY, ...params });
    const url = `${CONFIG.TMDB_BASE}/${endpoint}?${query}`;
    const promise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
        const data = await res.json();
        this.cache.set(key, { data, ts: Date.now() });
        if (this.cache.size > 50) {
          const first = this.cache.keys().next().value;
          this.cache.delete(first);
        }
        return data;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise;
  },

  async getGenres(type) {
    const data = await this.fetch(`genre/${type}/list`);
    return data.genres || [];
  },

  async getTopRated(type, page = 1) {
    return this.fetch(`${type}/top_rated`, { page });
  },

  async getLatest(type, endpoint, page = 1) {
    return this.fetch(`${type}/${endpoint}`, { page });
  },

  async discover(type, filters = {}) {
    const params = {};
    if (filters.genre) params.with_genres = filters.genre;
    if (filters.language) params.with_original_language = filters.language;
    if (filters.rating) params['vote_average.gte'] = filters.rating;
    if (filters.year) {
      const dateField = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
      params[dateField] = filters.year;
    }
    if (filters.page) params.page = filters.page;
    return this.fetch(`discover/${type}`, params);
  },

  async search(type, query, page = 1) {
    return this.fetch(`search/${type}`, { query, page });
  },

  async fetchAllUpTo(type, baseParams, minItems) {
    const items = [];
    let page = 1;
    let hitEnd = false;
    const MAX_PAGES = 500;
    while (items.length < minItems) {
      const data = await this.fetch(`discover/${type}`, { ...baseParams, page });
      const results = data.results || [];
      if (results.length === 0) break;
      items.push(...results);
      const totalPages = data.total_pages || 0;
      if (page >= totalPages || page >= MAX_PAGES) { hitEnd = true; break; }
      page++;
    }
    return { items, hasMore: !hitEnd };
  },

  async searchAllUpTo(type, query, minItems) {
    const items = [];
    let page = 1;
    let hitEnd = false;
    const MAX_PAGES = 500;
    while (items.length < minItems) {
      const data = await this.fetch(`search/${type}`, { query, page });
      const results = data.results || [];
      if (results.length === 0) break;
      items.push(...results);
      const totalPages = data.total_pages || 0;
      if (page >= totalPages || page >= MAX_PAGES) { hitEnd = true; break; }
      page++;
    }
    return { items, hasMore: !hitEnd };
  },

  getPosterUrl(path, size = 'medium') {
    if (!path) return null;
    return `${CONFIG.IMG_BASE}/${CONFIG.POSTER_SIZES[size]}${path}`;
  },

  async getDetail(type, id) {
    return this.fetch(`${type}/${id}`);
  },

  async getCredits(type, id) {
    return this.fetch(`${type}/${id}/credits`);
  },

  async getVideos(type, id) {
    return this.fetch(`${type}/${id}/videos`);
  },

  async getSimilar(type, id) {
    return this.fetch(`${type}/${id}/similar`);
  },

  async getSeason(tvId, seasonNum) {
    return this.fetch(`tv/${tvId}/season/${seasonNum}`);
  },
};

const OMDB = {
  key: CONFIG.OMDB_KEY,

  isAvailable() {
    return !!this.key;
  },

  async fetch(params = {}) {
    if (!this.isAvailable()) return null;
    const query = new URLSearchParams({ apikey: this.key, ...params });
    const url = `${CONFIG.OMDB_BASE}/?${query}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.Response === 'False') return null;
      return data;
    } catch {
      return null;
    }
  },

  async getByIMDBId(imdbId, plot = 'full') {
    return this.fetch({ i: imdbId, plot });
  },

  async getSeason(imdbId, seasonNum) {
    return this.fetch({ i: imdbId, Season: seasonNum });
  },
};
