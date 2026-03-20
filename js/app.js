/* ── APP ─────────────────────────────────────────── */
import { HomeView }    from './views/home.js';
import { DetailView }  from './views/detail.js';
import { SearchView }  from './views/search.js';
import { LibraryView } from './views/library.js';
import { LiveView }    from './views/live.js';

const app = document.getElementById('app');
const nav = document.getElementById('mainNav');

/* ── NAV VISIBILITY ── */
/* Only show nav on home/library/search — hide on detail/live */
const NAV_PAGES  = new Set(['home', 'library', 'search']);
function setNav(page) {
  nav.classList.toggle('hidden', !NAV_PAGES.has(page));
  document.querySelectorAll('.nav-link').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
}

/* ── MOUNT ── */
function mount(el) { app.innerHTML = ''; app.appendChild(el); window.scrollTo(0, 0); }

/* ── ROUTER ── */
let currentPage = 'home';

async function go(page, payload) {
  currentPage = page;
  setNav(page);

  switch (page) {
    case 'home':
      mount(await HomeView(
        (item, type, autoPlay) => go('detail', { item, type, autoPlay }),
        () => go('live')
      ));
      break;

    case 'detail': {
      const { item, type, autoPlay = false } = payload;
      mount(await DetailView(item, type, autoPlay,
        () => go('home'),
        (i, t) => go('detail', { item: i, type: t })
      ));
      break;
    }

    case 'search':
      mount(await SearchView(payload.query, (item, type) => go('detail', { item, type })));
      break;

    case 'library':
      mount(LibraryView((item, type) => go('detail', { item, type })));
      break;

    case 'live':
      mount(await LiveView(() => go('home')));
      break;
  }
}

/* ── NAV BUTTONS ── */
document.getElementById('logoLink').addEventListener('click', e => { e.preventDefault(); go('home'); });
document.getElementById('navLibrary').addEventListener('click', () => go('library'));
document.getElementById('navLive').addEventListener('click', () => go('live'));

/* ── SEARCH ── */
let debounce;
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(debounce);
  const q = e.target.value.trim();
  if (!q) { if (currentPage === 'search') go('home'); return; }
  debounce = setTimeout(() => go('search', { query: q }), 400);
});
document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim();
  if (q) go('search', { query: q });
});

/* ── BOOT ── */
go('home');
