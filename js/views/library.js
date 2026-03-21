import { mk, Empty, Tabs } from '../components.js';
import { history, watchlist } from '../storage.js';
import { img } from '../config.js';
import { icon } from '../icons.js';

export function LibraryView(onCard) {
  const root = mk('div', 'library-view');
  let active = 'watchlist';

  function render() {
    root.innerHTML = '';
    root.appendChild(mk('h2', 'page-heading', 'My Library'));
    root.appendChild(
      Tabs(
        [
          ['watchlist', 'Watchlist'],
          ['history', 'History'],
        ],
        active,
        (id) => {
          active = id;
          render();
        }
      )
    );

    const store = active === 'watchlist' ? watchlist : history;
    const items = store.get();

    if (!items.length) {
      root.appendChild(
        Empty(
          active === 'watchlist' ? 'Watchlist empty' : 'No history yet',
          'Browse to add titles'
        )
      );
      return;
    }

    const grid = mk('div', 'card-grid');
    items.forEach((r) => {
      const poster = r.poster ? img(r.poster, 'w342') : null;

      const card = mk('div', 'card lib-card');
      card.innerHTML = `
        <div class="card-thumb">
          ${poster ? `<img src="${poster}" alt="${r.title}" loading="lazy">` : `<div class="card-ph">${icon('film', 28, { stroke: 'var(--muted)' })}</div>`}
          <div class="card-overlay"><div class="card-play-icon">${icon('play', 20, { fill: '#000', stroke: 'none' })}</div></div>
          <button class="lib-remove-btn" title="Remove">${icon('x', 13)}</button>
        </div>
        <div class="card-body">
          <div class="card-title">${r.title}</div>
          <div class="card-foot"><span class="card-year">${r.type === 'tv' ? 'Series' : 'Film'}</span></div>
        </div>`;

      card.querySelector('.lib-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        store.remove(r.id, r.type);
        card.remove();
        if (!grid.children.length) render();
      });

      card.addEventListener('click', () =>
        onCard(
          { id: r.id, title: r.title, name: r.title, poster_path: r.poster },
          r.type
        )
      );
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }

  render();
  return root;
}
