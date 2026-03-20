/* ── LIBRARY VIEW ────────────────────────────────── */
import { mk, Card, Empty, Tabs } from '../components.js';
import { history, watchlist }    from '../storage.js';

const stored2item = r => ({ id: r.id, title: r.title, name: r.title, poster_path: r.poster, vote_average: null });

export function LibraryView(onCard) {
  const root = mk('div', 'library-view');
  let active = 'watchlist';

  function render() {
    root.innerHTML = '';
    root.innerHTML = '<h2 class="page-heading">My Library</h2>';
    root.appendChild(Tabs([['watchlist', 'Watchlist'], ['history', 'History']], active, id => { active = id; render(); }));

    const items = active === 'watchlist' ? watchlist.get() : history.get();

    if (!items.length) {
      root.appendChild(Empty(
        active === 'watchlist' ? '🔖' : '🕐',
        active === 'watchlist' ? 'Watchlist empty' : 'No history yet',
        'Browse to add titles'
      ));
      return;
    }

    const clearBtn = mk('button', 'ghost-btn', `Clear ${active === 'watchlist' ? 'Watchlist' : 'History'}`);
    clearBtn.addEventListener('click', () => {
      (active === 'watchlist' ? watchlist : history).clear();
      render();
    });
    root.appendChild(clearBtn);

    const grid = mk('div', 'card-grid');
    items.forEach(r => grid.appendChild(Card({ item: stored2item(r), type: r.type, onClick: onCard })));
    root.appendChild(grid);
  }

  render();
  return root;
}
