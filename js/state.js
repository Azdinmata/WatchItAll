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
