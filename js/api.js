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
