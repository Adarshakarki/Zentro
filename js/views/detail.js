import { api } from '../api.js';
import { img } from '../config.js';
import { mk, Loader, Card, Empty } from '../components.js';
import { icon } from '../icons.js';
import { openMoviePlayer, openEpisodePlayer } from '../player.js';
import { history, watchlist, progress } from '../storage.js';

function getLogoUrl(images) {
  const logos = images?.logos || [];
  const en = logos.find((l) => l.iso_639_1 === 'en') || logos[0];
  return en ? img(en.file_path, 'w500') : null;
}

/* Fetch actor profile photo from Wikipedia */
async function wikiPhoto(name) {
  try {
    const u = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=120&origin=*`;
    const d = await fetch(u).then((r) => r.json());
    const pages = d.query?.pages || {};
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

export async function DetailView(item, type, onBack, onCard) {
  const root = mk('div', 'detail-view');
  root.appendChild(Loader());
  history.add(item, type);

  try {
    const d = await api.detail(type, item.id);
    const title = d.title || d.name;
    const year = (d.release_date || d.first_air_date || '').slice(0, 4);
    const rating = d.vote_average?.toFixed(1);
    const runtime = d.runtime
      ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
      : d.number_of_seasons
        ? `${d.number_of_seasons} Season${d.number_of_seasons > 1 ? 's' : ''}`
        : '';
    const genres = (d.genres || [])
      .slice(0, 4)
      .map((g) => g.name)
      .join(' · ');
    const cast = (d.credits?.cast || []).slice(0, 12);
    const similar = (d.similar?.results || [])
      .filter((x) => x.poster_path)
      .slice(0, 18);
    const backdrop = img(d.backdrop_path, 'original');
    const logoUrl = getLogoUrl(d.images);
    const inWl = watchlist.has(item.id, type);

    root.innerHTML = '';

    /* back */
    const back = mk('button', 'back-btn detail-back');
    back.innerHTML = icon('chevronLeft', 20);
    back.addEventListener('click', onBack);
    root.appendChild(back);

    /* hero */
    const hero = mk('div', 'detail-hero');
    if (backdrop) hero.style.backgroundImage = `url(${backdrop})`;
    root.appendChild(hero);

    const content = mk('div', 'detail-content');
    hero.innerHTML = `<div class="detail-hero-overlay"></div>`;
    hero.appendChild(content);

    if (logoUrl) {
      content.appendChild(
        mk(
          'div',
          'detail-logo-wrap',
          `<img class="detail-logo" src="${logoUrl}" alt="${title}">`
        )
      );
    } else {
      content.appendChild(mk('h1', 'detail-title', title));
    }

    const metaParts = [
      rating ? `<span class="dc-chip gold">★ ${rating}</span>` : '',
      year ? `<span class="dc-chip">${year}</span>` : '',
      runtime ? `<span class="dc-chip">${runtime}</span>` : '',
      genres ? `<span class="dc-chip">${genres}</span>` : '',
    ]
      .filter(Boolean)
      .join('<span class="dc-sep">·</span>');
    if (metaParts) content.appendChild(mk('div', 'detail-chips', metaParts));

    if (d.overview) {
      const ov = mk('p', 'detail-overview');
      ov.textContent =
        d.overview.slice(0, 300) + (d.overview.length > 300 ? '…' : '');
      content.appendChild(ov);
    }

    const acts = mk('div', 'detail-actions');
    const playBtn = mk('button', 'action-btn primary');
    playBtn.innerHTML = `${icon('play', 16, { fill: 'currentColor', stroke: 'none' })} Play`;
    acts.appendChild(playBtn);

    const wlBtn = mk('button', 'action-btn ghost');
    wlBtn.innerHTML = `${icon('bookmark', 15, { fill: inWl ? 'currentColor' : 'none' })} ${inWl ? 'Saved' : 'Watchlist'}`;
    acts.appendChild(wlBtn);

    if (type === 'tv') {
      const epScrollBtn = mk('button', 'action-btn ghost');
      epScrollBtn.innerHTML = `${icon('list', 15)} Episodes`;
      epScrollBtn.addEventListener('click', () =>
        root
          .querySelector('.detail-episodes')
          ?.scrollIntoView({ behavior: 'smooth' })
      );
      acts.appendChild(epScrollBtn);
    }
    content.appendChild(acts);

    /* movie player */
    if (type === 'movie')
      playBtn.addEventListener('click', () => openMoviePlayer(item));

    /* tv */
    if (type === 'tv') {
      const validSeasons = (d.seasons || []).filter((s) => s.season_number > 0);
      playBtn.addEventListener('click', () => openEpisodePlayer(item.id, 1, 1));

      if (validSeasons.length) {
        const epSection = mk('div', 'detail-episodes');
        epSection.appendChild(mk('h3', 'section-heading', 'Episodes'));
        const seasonRow = mk('div', 'season-row');
        validSeasons.forEach((s) => {
          const b = mk(
            'button',
            `s-btn${s.season_number === 1 ? ' active' : ''}`,
            `Season ${s.season_number}`
          );
          b.dataset.s = s.season_number;
          b.addEventListener('click', () => loadSeason(s.season_number));
          seasonRow.appendChild(b);
        });
        epSection.appendChild(seasonRow);
        const epGrid = mk('div', 'ep-grid');
        epSection.appendChild(epGrid);
        root.appendChild(epSection);

        async function loadSeason(n) {
          epSection
            .querySelectorAll('.s-btn')
            .forEach((b) => b.classList.toggle('active', +b.dataset.s === n));
          epGrid.innerHTML = '';
          epGrid.appendChild(Loader());
          try {
            const sd = await api.season(item.id, n);
            epGrid.innerHTML = '';
            (sd.episodes || []).forEach((ep) => {
              const epKey = `tv_${item.id}_s${n}_e${ep.episode_number}`;
              const prog = progress.get(epKey);
              const thumb = ep.still_path
                ? `<img src="${img(ep.still_path, 'w300')}" loading="lazy">`
                : `<div class="ep-thumb-ph">${icon('play', 18, { stroke: 'var(--muted)' })}</div>`;
              const overviewTxt =
                (ep.overview || '').slice(0, 160) +
                (ep.overview?.length > 160 ? '…' : '');
              const card = mk('div', 'ep-card ep-btn');
              card.innerHTML = `
                <div class="ep-thumb">${thumb}
                  ${prog ? `<div class="ep-prog-bar"><div style="width:${prog.p}%"></div></div>` : ''}
                  <div class="ep-play-overlay">${icon('play', 22, { fill: 'currentColor', stroke: 'none' })}</div>
                </div>
                <div class="ep-info">
                  <div class="ep-header">
                    <span class="ep-num">E${ep.episode_number}</span>
                    ${ep.runtime ? `<span class="ep-runtime">${ep.runtime}m</span>` : ''}
                  </div>
                  <div class="ep-name">${ep.name || ''}</div>
                  ${overviewTxt ? `<div class="ep-overview">${overviewTxt}</div>` : ''}
                  ${prog ? `<span class="ep-time">${progress.label(epKey) || ''}</span>` : ''}
                </div>`;
              card.addEventListener('click', () =>
                openEpisodePlayer(item.id, n, ep.episode_number)
              );
              epGrid.appendChild(card);
            });
          } catch {
            epGrid.innerHTML = '';
            epGrid.appendChild(Empty('Failed to load episodes'));
          }
        }
        await loadSeason(1);
      }
    }

    /* watchlist */
    wlBtn.addEventListener('click', () => {
      const added = watchlist.toggle(item, type);
      wlBtn.innerHTML = `${icon('bookmark', 15, { fill: added ? 'currentColor' : 'none' })} ${added ? 'Saved' : 'Watchlist'}`;
    });

    /* cast with Wikipedia photos */
    if (cast.length) {
      const castSection = mk('div', 'cast-section');
      castSection.appendChild(mk('h3', 'section-heading', 'Cast'));
      const castGrid = mk('div', 'cast-grid');
      castSection.appendChild(castGrid);
      root.appendChild(castSection);

      /* render placeholders immediately */
      cast.forEach((c) => {
        const card = mk('div', 'cast-card');
        card.dataset.name = c.name;
        card.innerHTML = `
          <div class="cast-avatar">
            ${
              c.profile_path
                ? `<img src="${img(c.profile_path, 'w185')}" alt="${c.name}" loading="lazy">`
                : `<div class="cast-avatar-ph">${icon('play', 16, { stroke: 'var(--muted)' })}</div>`
            }
          </div>
          <div class="cast-info">
            <span class="cast-name">${c.name}</span>
            <span class="cast-char">${c.character || ''}</span>
          </div>`;
        castGrid.appendChild(card);
      });

      /* enrich with Wikipedia photos where TMDB has no profile */
      cast.forEach(async (c) => {
        if (c.profile_path) return; /* already has photo */
        const wikiUrl = await wikiPhoto(c.name);
        if (!wikiUrl) return;
        const card = castGrid.querySelector(
          `[data-name="${CSS.escape(c.name)}"]`
        );
        if (!card) return;
        const ph = card.querySelector('.cast-avatar-ph');
        if (ph)
          ph.outerHTML = `<img src="${wikiUrl}" alt="${c.name}" loading="lazy">`;
      });
    }

    /* similar */
    if (similar.length) {
      const sim = mk('div', 'similar-section');
      sim.appendChild(mk('h3', 'section-heading', 'More Like This'));
      const grid = mk('div', 'card-grid');
      similar.forEach((s) =>
        grid.appendChild(Card({ item: s, type, onClick: onCard }))
      );
      sim.appendChild(grid);
      root.appendChild(sim);
    }
  } catch (e) {
    root.innerHTML = '';
    root.appendChild(Empty('Failed to load', e.message));
  }
  return root;
}
