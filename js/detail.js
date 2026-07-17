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

      epRow.addEventListener('scroll', updateArrows);
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
    window.location.hash = target;
  },
};
