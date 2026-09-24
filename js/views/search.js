import { api } from '../api.js';
import { mk, Card, Loader, Empty } from '../components.js';

let searchAbortCtrl = null;

export async function SearchView(query, onCard) {
  if (searchAbortCtrl) {
    searchAbortCtrl.abort();
  }
  searchAbortCtrl = new AbortController();
  const signal = searchAbortCtrl.signal;

  const root = mk('div', 'search-view');
  root.innerHTML = `<h2 class="page-heading">Results for <em>"${query}"</em></h2>`;
  root.appendChild(Loader());

  try {
    const data = await api.search(query, signal);
    const results = (data.results || []).filter(
      (x) =>
        x.poster_path && (x.media_type === 'movie' || x.media_type === 'tv')
    );

    root.querySelector('.state-loader')?.remove();

    if (!results.length) {
      root.appendChild(
        Empty('No results', 'Try a different keyword', 'search')
      );
      return root;
    }

    const grid = mk('div', 'card-grid');
    results
      .slice(0, 40)
      .forEach((i) =>
        grid.appendChild(
          Card({ item: i, type: i.media_type, onClick: onCard, showType: true })
        )
      );
    root.appendChild(grid);
  } catch (e) {
    if (e.name === 'AbortError') return root;
    root.querySelector('.state-loader')?.remove();
    root.appendChild(Empty('Search failed', e.message, 'alertCircle'));
  }

  return root;
}
