import { HomeView } from './views/home.js';
import { DetailView } from './views/detail.js';
import { SearchView } from './views/search.js';
import { LibraryView } from './views/library.js';
import { LiveView } from './views/live.js';

const app = document.getElementById('app');
const nav = document.getElementById('mainNav');

/* scroll-hide nav */
let lastY = 0;
let ticking = false;
const THRESHOLD = 80; /* px before hide kicks in */

window.addEventListener(
  'scroll',
  () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const down = y > lastY;
      if (y < THRESHOLD) {
        nav.classList.remove('nav-hidden');
      } else if (down) {
        nav.classList.add('nav-hidden');
        closeBrowse();
      } else {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
      ticking = false;
    });
    ticking = true;
  },
  { passive: true }
);

/* nav overlay (home hero) */
const NAV_PAGES = new Set(['home', 'library', 'search', 'browse']);
function setNav(page) {
  const show = NAV_PAGES.has(page);
  nav.classList.toggle('nav-overlay', page === 'home');
  nav.classList.toggle('nav-force-hide', !show);
  nav.classList.remove('nav-hidden');
  lastY = 0;
  document
    .querySelectorAll('.nav-link[id]')
    .forEach((el) =>
      el.classList.toggle(
        'active',
        el.id === `nav${page.charAt(0).toUpperCase() + page.slice(1)}`
      )
    );
}

function mount(el) {
  app.innerHTML = '';
  app.appendChild(el);
  window.scrollTo(0, 0);
}

/* browse dropdown */
const browseWrap = document.getElementById('browseWrap');
const browseBtn = document.getElementById('navBrowse');

function closeBrowse() {
  browseWrap.classList.remove('open');
}
function toggleBrowse() {
  browseWrap.classList.toggle('open');
}

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleBrowse();
});
document.addEventListener('click', (e) => {
  if (!browseWrap.contains(e.target)) closeBrowse();
});

document.querySelectorAll('.browse-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    closeBrowse();
    const target = btn.dataset.go;
    if (target === 'live') {
      go('live');
      return;
    }
    if (target === 'movies') {
      go('browse', { type: 'movie' });
      return;
    }
    if (target === 'series') {
      go('browse', { type: 'tv' });
      return;
    }
  });
});

/* router */
async function go(page, payload = {}) {
  setNav(page);
  switch (page) {
    case 'home':
      mount(
        await HomeView(
          (item, type) => go('detail', { item, type }),
          () => go('live')
        )
      );
      break;

    case 'detail': {
      const { item, type } = payload;
      window.location.hash = `#/${type}/${item.id}`;
      mount(
        await DetailView(
          item,
          type,
          () => window.history.back(),
          (i, t) => go('detail', { item: i, type: t })
        )
      );
      break;
    }

    case 'browse': {
      const { type } = payload;
      window.location.hash = `#/browse/${type}`;
      const { BrowseView } = await import('./views/browse.js');
      mount(
        await BrowseView(type, (item, t) => go('detail', { item, type: t }))
      );
      break;
    }

    case 'search':
      mount(
        await SearchView(payload.query, (item, type) =>
          go('detail', { item, type })
        )
      );
      break;

    case 'library':
      window.location.hash = '#/library';
      mount(LibraryView((item, type) => go('detail', { item, type })));
      break;

    case 'live':
      window.location.hash = '#/live';
      mount(await LiveView(() => go('home')));
      break;
  }
}

/* hash routing */
function handleHash() {
  const hash = window.location.hash.replace('#/', '');
  if (!hash || hash === '/') {
    go('home');
    return;
  }
  const parts = hash.split('/');
  if (parts[0] === 'live') {
    go('live');
    return;
  }
  if (parts[0] === 'library') {
    go('library');
    return;
  }
  if (parts[0] === 'browse' && parts[1]) {
    go('browse', { type: parts[1] });
    return;
  }
  if ((parts[0] === 'movie' || parts[0] === 'tv') && parts[1]) {
    go('detail', { item: { id: +parts[1] }, type: parts[0] });
    return;
  }
  go('home');
}

window.addEventListener('popstate', handleHash);

/* nav buttons */
document.getElementById('navHome').addEventListener('click', () => {
  window.location.hash = '#/';
  go('home');
});
document
  .getElementById('navLibrary')
  .addEventListener('click', () => go('library'));
document.querySelector('.logo').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.hash = '#/';
  go('home');
});

/* search */
let debounce;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(debounce);
  const q = e.target.value.trim();
  if (!q) return;
  debounce = setTimeout(() => go('search', { query: q }), 400);
});
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim();
  if (q) go('search', { query: q });
});

handleHash();
