/* ── DETAIL VIEW ─────────────────────────────────── */
import { api }                      from '../api.js';
import { img }                      from '../config.js';
import { mk, Loader, Card, Empty }  from '../components.js';
import { MoviePlayer, TVPlayer }    from '../player.js';
import { history, watchlist }       from '../storage.js';

export async function DetailView(item, type, autoPlay = false, onBack, onCard) {
  /* full-page — nav is hidden by app.js before calling this */
  const root = mk('div', 'detail-view');
  root.appendChild(Loader());

  history.add(item, type);

  try {
    const d       = await api.detail(type, item.id);
    const title   = d.title || d.name;
    const year    = (d.release_date || d.first_air_date || '').slice(0, 4);
    const rating  = d.vote_average?.toFixed(1);
    const runtime = d.runtime
      ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
      : d.number_of_seasons
        ? `${d.number_of_seasons} Season${d.number_of_seasons > 1 ? 's' : ''}`
        : '';
    const genres  = (d.genres || []).slice(0, 4);
    const cast    = (d.credits?.cast || []).slice(0, 8);
    const similar = (d.similar?.results || []).filter(x => x.poster_path).slice(0, 12);
    const bdrop   = img(d.backdrop_path, 'original');
    const poster  = img(d.poster_path, 'w500');

    root.innerHTML = '';

    /* ── BACK ── */
    const back = mk('button', 'back-btn');
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><path d="m15 18-6-6 6-6"/></svg> Back`;
    back.addEventListener('click', onBack);
    root.appendChild(back);

    /* ── BACKDROP ── */
    if (bdrop) {
      const hero = mk('div', 'detail-hero');
      hero.innerHTML = `<img src="${bdrop}" alt=""><div class="detail-hero-grad"></div>`;
      root.appendChild(hero);
    }

    /* ── META ── */
    const meta = mk('div', 'detail-meta');
    meta.innerHTML = `
      <div class="detail-poster-wrap">
        ${poster ? `<img class="detail-poster" src="${poster}" alt="${title}">` : '<div class="detail-poster-ph">🎬</div>'}
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${title}</h1>
        <div class="detail-chips">
          ${rating  ? `<span class="chip gold">★ ${rating}</span>` : ''}
          ${year    ? `<span class="chip">${year}</span>` : ''}
          ${runtime ? `<span class="chip">${runtime}</span>` : ''}
          <span class="chip">${type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        ${genres.length ? `<div class="genre-row">${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}</div>` : ''}
        ${d.overview ? `<p class="detail-overview">${d.overview}</p>` : ''}
        ${cast.length ? `
          <div class="cast-block">
            <div class="cast-label">Cast</div>
            <div class="cast-names">${cast.map(c => `<span>${c.name}</span>`).join('')}</div>
          </div>` : ''}
        <div class="detail-actions">
          ${type === 'movie' ? `
            <button class="action-btn primary" id="watchNow">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16"><path d="M8 5v14l11-7z"/></svg>
              Watch Now
            </button>` : ''}
          <button class="action-btn ghost" id="wlBtn">
            <svg viewBox="0 0 24 24" fill="${watchlist.has(item.id, type) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            ${watchlist.has(item.id, type) ? 'In Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      </div>`;
    root.appendChild(meta);

    /* ── PLAYER SLOT ── */
    const playerSlot = mk('div', 'player-slot');
    root.appendChild(playerSlot);

    /* movie watch now */
    if (type === 'movie') {
      const watchBtn = root.querySelector('#watchNow');
      const playMovie = () => {
        playerSlot.innerHTML = '';
        playerSlot.appendChild(MoviePlayer(item));
        playerSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        watchBtn.textContent = '↩ Replay';
      };
      watchBtn.addEventListener('click', playMovie);
      if (autoPlay) playMovie();
    }

    /* ── TV: episode grid ── */
    if (type === 'tv') {
      const validSeasons = (d.seasons || []).filter(s => s.season_number > 0);
      if (validSeasons.length) {
        const tvWrap = await TVPlayer(item, validSeasons);
        playerSlot.appendChild(tvWrap);
        if (autoPlay) tvWrap.querySelector('.ep-btn')?.click();
      }
    }

    /* watchlist toggle */
    root.querySelector('#wlBtn')?.addEventListener('click', function () {
      const added = watchlist.toggle(item, type);
      this.innerHTML = `
        <svg viewBox="0 0 24 24" fill="${added ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        ${added ? 'In Watchlist' : 'Add to Watchlist'}`;
    });

    /* ── SIMILAR ── */
    if (similar.length) {
      const sim = mk('div', 'similar-section');
      sim.innerHTML = '<h3 class="section-heading">More Like This</h3>';
      const grid = mk('div', 'card-grid');
      similar.forEach(s => grid.appendChild(Card({ item: s, type, onClick: onCard })));
      sim.appendChild(grid);
      root.appendChild(sim);
    }

  } catch (e) {
    root.innerHTML = '';
    root.appendChild(Empty('⚠️', 'Failed to load', e.message));
  }

  return root;
}
