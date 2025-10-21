import { el } from '../ui/dom.js';
import { createUnitCard } from '../ui/unitCard.js';
import { getShortName } from '../ui/identity.js';

export function createGraveyardPage(graveyard) {
  const page = el('div', { className: 'graveyard-page page' });
  if (!graveyard || graveyard.length === 0) {
    const card = el('div', { className: 'card graveyard-empty-card' });
    card.appendChild(el('h2', { className: 'section-title', text: '무덤' }));
    card.appendChild(el('p', { text: '아직 전사한 아군이 없습니다.' }));
    page.appendChild(card);
    return page;
  }

  const layout = el('div', { className: 'layout-grid graveyard-grid' });
  graveyard.forEach((entry) => {
    const card = el('div', { className: 'card graveyard-entry-card' });
    const displayName = getShortName(entry.name) || entry.name || '이름 없는 전투원';
    const header = el('div', {
      className: 'status-banner failure',
      text: `${displayName} — ${entry.roundFallen}라운드 전사`,
    });
    card.appendChild(header);
    const unitCard = createUnitCard({ unit: entry.unit, showTraits: false });
    card.appendChild(unitCard);
    layout.appendChild(card);
  });
  page.appendChild(layout);
  return page;
}
