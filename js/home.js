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
