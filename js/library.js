const LibrarySection = {
  init() {
    this.bindEvents();
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
