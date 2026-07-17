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
    if (this.currentType && this.currentId) {
      window.location.hash = `#detail/${this.currentType}/${this.currentId}`;
    } else {
      window.location.hash = this.prevHash || '#home';
    }
  },
};
