import { api } from '../api.js';
import { img, TMDB } from '../config.js';
import { mk, Empty } from '../components.js';
import { icon } from '../icons.js';

async function fetchLogo(type, id) {
  try {
    const u = new URL(`${TMDB.base}/${type}/${id}/images`);
    u.searchParams.set('api_key', TMDB.key);
    const d = await fetch(u).then((r) => r.json());
    const en =
      (d.logos || []).find((l) => l.iso_639_1 === 'en') || (d.logos || [])[0];
    return en ? img(en.file_path, 'w500') : null;
  } catch {
    return null;
  }
}

function Hero(items, logos, onCard) {
  let idx = 0,
    animating = false;
  const hero = mk('div', 'hero');
  const inner = mk('div', 'hero-inner');
  hero.appendChild(inner);

  const slides = items.map((item) => {
    const type = item.media_type || 'movie';
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average?.toFixed(1);
    const backdrop = img(item.backdrop_path, 'original');
    const logoUrl = logos[item.id];
    const slide = mk('div', 'hero-slide');
    slide.innerHTML = `
      ${backdrop ? `<img class="hero-bg" src="${backdrop}" alt="">` : ''}
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badges">
          ${rating ? `<span class="badge-rating">★ ${rating}</span>` : ''}
          ${year ? `<span class="badge-plain">${year}</span>` : ''}
          <span class="badge-plain">${type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        ${
          logoUrl
            ? `<div class="hero-logo-wrap"><img class="hero-logo" src="${logoUrl}" alt="${title}"></div>`
            : `<h1 class="hero-title">${title}</h1>`
        }
        <p class="hero-overview">${(item.overview || '').slice(0, 200)}${(item.overview?.length || 0) > 200 ? '…' : ''}</p>
        <div class="hero-btns">
          <button class="hero-btn primary" data-play="1">
            ${icon('play', 18, { fill: 'currentColor', stroke: 'none' })} Watch Now
          </button>
          <button class="hero-btn ghost" data-info="1">More Info</button>
        </div>
      </div>`;
    slide
      .querySelector('[data-play]')
      .addEventListener('click', () => onCard(item, type, true));
    slide
      .querySelector('[data-info]')
      .addEventListener('click', () => onCard(item, type, false));
    inner.appendChild(slide);
    return slide;
  });

  slides[0].classList.add('active');

  const dotsEl = mk('div', 'hero-dots');
  inner.appendChild(dotsEl);

  function updateDots() {
    dotsEl.innerHTML = items
      .slice(0, 6)
      .map(
        (_, i) =>
          `<button class="dot${i === idx ? ' active' : ''}" data-i="${i}"></button>`
      )
      .join('');
    dotsEl.querySelectorAll('.dot').forEach((d) =>
      d.addEventListener('click', () => {
        if (!animating) goTo(+d.dataset.i);
      })
    );
  }

  function goTo(next) {
    if (next === idx || animating) return;
    animating = true;
    slides[idx].classList.remove('active');
    slides[idx].classList.add('prev');
    idx = next;
    slides[idx].classList.add('active');
    updateDots();
    setTimeout(() => {
      slides.forEach((s) => s.classList.remove('prev'));
      animating = false;
    }, 850);
  }

  updateDots();
  const timer = setInterval(
    () => goTo((idx + 1) % Math.min(items.length, 6)),
    7000
  );
  hero._stop = () => clearInterval(timer);
  return hero;
}

function ToggleRow({ label, movieItems, tvItems, onCard }) {
  const sec = mk('div', 'row-section');
  const head = mk('div', 'row-head');
  const title = mk('span', 'row-title', label);
  const toggle = mk('div', 'row-toggle');

  const btnM = mk('button', 'row-toggle-btn active', 'Movies');
  const btnS = mk('button', 'row-toggle-btn', 'Series');
  toggle.appendChild(btnM);
  toggle.appendChild(btnS);
  head.appendChild(title);
  head.appendChild(toggle);
  sec.appendChild(head);

  const scroll = mk('div', 'row-scroller');
  const track = mk('div', 'row-track');
  scroll.appendChild(track);
  sec.appendChild(scroll);

  function renderCards(items, type) {
    track.innerHTML = '';
    items.forEach((item) => track.appendChild(makeCard(item, type, onCard)));
  }

  btnM.addEventListener('click', () => {
    btnM.classList.add('active');
    btnS.classList.remove('active');
    renderCards(movieItems, 'movie');
  });
  btnS.addEventListener('click', () => {
    btnS.classList.add('active');
    btnM.classList.remove('active');
    renderCards(tvItems, 'tv');
  });

  renderCards(movieItems, 'movie');
  return sec;
}

function PlainRow({ label, items, type, badge, onCard }) {
  const sec = mk('div', 'row-section');
  const head = mk('div', 'row-head');
  head.appendChild(mk('span', 'row-title', label));
  if (badge)
    head.appendChild(
      mk(
        'span',
        `row-type-badge ${badge}`,
        badge === 'movie' ? 'Movies' : 'Series'
      )
    );
  sec.appendChild(head);
  const scroll = mk('div', 'row-scroller');
  const track = mk('div', 'row-track');
  items.forEach((item) =>
    track.appendChild(
      makeCard(item, type || item.media_type || 'movie', onCard)
    )
  );
  scroll.appendChild(track);
  sec.appendChild(scroll);
  return sec;
}

function makeCard(item, type, onCard) {
  const poster = img(item.poster_path, 'w342');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const title = item.title || item.name;
  const card = mk('div', 'card');
  card.innerHTML = `
    <div class="card-thumb">
      ${poster ? `<img src="${poster}" alt="${title}" loading="lazy">` : `<div class="card-ph">${icon('film', 28, { stroke: 'var(--muted)' })}</div>`}
      <div class="card-overlay"><div class="card-play-icon">${icon('play', 20, { fill: '#000', stroke: 'none' })}</div></div>
      ${rating ? `<div class="card-rating">★ ${rating}</div>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${title}</div>
      ${year ? `<div class="card-foot"><span class="card-year">${year}</span></div>` : ''}
    </div>`;
  card.addEventListener('click', () => onCard(item, type));
  return card;
}

export async function HomeView(onCard) {
  const root = mk('div', 'home-view');
  root.innerHTML = `<div class="state-loader" style="min-height:60vh"><div class="spin-ring"><div></div><div></div><div></div><div></div></div></div>`;

  try {
    const res = await Promise.allSettled([
      api.trending(),
      api.trendingMovies(),
      api.trendingTV(),
      api.topRated(),
      api.topRatedTV(),
      api.netflixTV(),
      api.hboTV(),
      api.primeTV(),
      api.appleTV(),
      api.disneyTV(),
      api.anime(),
    ]);
    const ok = (r) =>
      r.status === 'fulfilled'
        ? (r.value.results || []).filter((x) => x.poster_path)
        : [];
    const [
      trending,
      tMov,
      tTV,
      topMov,
      topTV,
      netflix,
      hbo,
      prime,
      apple,
      disney,
      anime,
    ] = res.map(ok);

    root.innerHTML = '';

    const heroItems = trending.filter((x) => x.backdrop_path).slice(0, 6);
    if (heroItems.length) {
      const logos = {};
      await Promise.all(
        heroItems.map(async (item) => {
          const t = item.media_type === 'tv' ? 'tv' : 'movie';
          const u = await fetchLogo(t, item.id);
          if (u) logos[item.id] = u;
        })
      );
      root.appendChild(Hero(heroItems, logos, onCard));
    }

    root.appendChild(
      ToggleRow({
        label: 'Trending',
        movieItems: tMov.slice(0, 20),
        tvItems: tTV.slice(0, 20),
        onCard,
      })
    );
    root.appendChild(
      ToggleRow({
        label: 'Top Rated',
        movieItems: topMov.slice(0, 20),
        tvItems: topTV.slice(0, 20),
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'Netflix',
        items: netflix.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'HBO / Max',
        items: hbo.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'Prime Video',
        items: prime.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'Apple TV+',
        items: apple.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'Disney+',
        items: disney.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
    root.appendChild(
      PlainRow({
        label: 'Anime',
        items: anime.slice(0, 20),
        type: 'tv',
        badge: 'series',
        onCard,
      })
    );
  } catch (e) {
    root.innerHTML = '';
    root.appendChild(Empty('Failed to load', e.message));
  }
  return root;
}
