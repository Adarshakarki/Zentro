/* ── LIVE TV VIEW ────────────────────────────────── */
import { fetchLiveChannels }   from '../api.js';
import { mk, Loader, Empty }   from '../components.js';
import { LivePlayer }          from '../player.js';

export async function LiveView(onBack) {
  const root = mk('div', 'live-view');

  /* back */
  const back = mk('button', 'back-btn');
  back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18"><path d="m15 18-6-6 6-6"/></svg> Back`;
  back.addEventListener('click', onBack);
  root.appendChild(back);

  const heading = mk('div', 'live-heading');
  heading.innerHTML = `
    <h1 class="live-title"><span class="live-dot-lg">●</span> Live TV</h1>
    <p class="live-sub">Free live channels — news, sports &amp; entertainment</p>`;
  root.appendChild(heading);

  /* player area */
  const playerArea = mk('div', 'live-player-area');
  playerArea.innerHTML = '<div class="live-player-placeholder"><span>← Select a channel</span></div>';
  root.appendChild(playerArea);

  /* channel grid */
  const grid = mk('div', 'live-grid');
  root.appendChild(grid);
  grid.appendChild(Loader('Loading channels…'));

  try {
    const channels = await fetchLiveChannels();

    grid.innerHTML = '';

    if (!channels.length) {
      grid.appendChild(Empty('📡', 'No channels found', 'Try again later'));
      return root;
    }

    let activeCard = null;

    channels.forEach(ch => {
      const card = mk('div', 'live-card');
      card.innerHTML = `
        <div class="live-card-logo">
          ${ch.logo ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy">` : `<span>${ch.name[0]}</span>`}
        </div>
        <div class="live-card-name">${ch.name}</div>
        <div class="live-card-cat">${(ch.categories || [])[0] || ''}</div>`;

      card.addEventListener('click', () => {
        if (activeCard) activeCard.classList.remove('active');
        card.classList.add('active');
        activeCard = card;

        playerArea.innerHTML = '';
        playerArea.appendChild(LivePlayer(ch));
        playerArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      grid.appendChild(card);
    });

  } catch (e) {
    grid.innerHTML = '';
    grid.appendChild(Empty('⚠️', 'Failed to load channels', e.message));
  }

  return root;
}
