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
