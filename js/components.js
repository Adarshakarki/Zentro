import { img } from './config.js';
import { icon } from './icons.js';
import { progress } from './storage.js';

export const mk = (tag, cls = '', html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

export function Loader(msg = '') {
  return mk(
    'div',
    'state-loader',
    `<div class="spin-ring"><div></div><div></div><div></div><div></div></div>${msg ? `<span>${msg}</span>` : ''}`
  );
}

export function Empty(title = 'Nothing here', sub = '') {
  return mk(
    'div',
    'state-empty',
    `<h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}`
  );
}

export function Card({ item, type, onClick, showType = false }) {
  const title = item.title || item.name;
  const year = (
    item.release_date || item.first_air_date || item.added
      ? new Date(item.added).getFullYear().toString()
      : ''
  ).slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const poster = img(item.poster_path, 'w342');
  const mtype = type || item.media_type || 'movie';
  const pKey = progress.getKey(
    item.id,
    mtype,
    item.season_number,
    item.episode_number
  );
  const prog = progress.get(pKey);

  const card = mk('div', 'card');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${title}`);
  card.innerHTML = `
    <div class="card-thumb">
      ${poster ? `<img src="${poster}" alt="${title}" loading="lazy">` : `<div class="card-ph">${icon('film', 28, { stroke: 'var(--muted)' })}</div>`}
      <div class="card-overlay">
        <div class="card-play-icon">${icon('play', 20, { fill: '#000', stroke: 'none' })}</div>
      </div>
      ${rating ? `<div class="card-rating">★ ${rating}</div>` : ''}
      ${showType ? `<div class="card-type">${mtype === 'tv' ? 'Series' : 'Film'}</div>` : ''}
      ${prog ? `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${prog.p}%"></div></div>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-foot">
        ${year ? `<span class="card-year">${year}</span>` : ''}
        ${prog ? `<span class="card-time-left">${progress.label(pKey) || ''}</span>` : ''}
      </div>
    </div>`;

  card.addEventListener('click', () => onClick(item, mtype));
  return card;
}

export function Row({
  label,
  sublabel = '',
  items,
  type,
  onCard,
  showType = false,
  badge = '',
}) {
  const sec = mk('div', 'row-section');
  const head = mk('div', 'row-head');
  head.innerHTML = `
    <h2 class="row-title">${label}</h2>
    ${sublabel ? `<span class="row-sub">${sublabel}</span>` : ''}`;

  if (badge) {
    head.appendChild(
      mk(
        'span',
        `row-type-badge ${badge}`,
        badge === 'movie' ? 'Movies' : 'Series'
      )
    );
  }
  sec.appendChild(head);

  const track = mk('div', 'row-track');
  const scroll = mk('div', 'row-scroller');
  items.forEach((i) =>
    track.appendChild(Card({ item: i, type, onClick: onCard, showType }))
  );
  scroll.appendChild(track);
  sec.appendChild(scroll);
  return sec;
}

export function Tabs(tabs, active, onChange) {
  const bar = mk('div', 'tab-bar');
  tabs.forEach(([id, label]) => {
    const b = mk('button', `tab-item${id === active ? ' active' : ''}`, label);
    b.addEventListener('click', () => onChange(id));
    bar.appendChild(b);
  });
  return bar;
}
