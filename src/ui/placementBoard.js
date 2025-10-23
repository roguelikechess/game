import { el } from './dom.js';
import { getUnitDefinition, getUnitSkill, buildBaseStats } from '../game/units.js';
import { FIELD_WIDTH, FIELD_HEIGHT } from '../game/combat.js';
import { getSpriteById } from '../data/assets.js';
import { attachTooltip, buildUnitTooltip } from './tooltipHelpers.js';
import { getJobById } from '../game/jobs.js';
import { summarizeUnitItems } from '../game/party.js';
import { applyItemBonuses } from '../game/items.js';

const TOKEN_DISPLAY_SIZE = 64;

function collectSpriteSources(sprite, action = 'idle') {
  if (!sprite) {
    return [];
  }
  const variantSources = Array.isArray(sprite.variantSources?.[action])
    ? sprite.variantSources[action]
    : [];
  const extra = [];
  if (sprite.variants?.[action]) {
    extra.push(sprite.variants[action]);
  }
  if (action === 'idle' && sprite.src) {
    extra.push(sprite.src);
  }
  return Array.from(new Set([...variantSources, ...extra].filter(Boolean)));
}

function applySpritePreview(element, sprite, action = 'idle') {
  if (!element) {
    return;
  }
  element.classList.remove('has-image');
  element.style.backgroundImage = '';
  element.style.backgroundSize = 'contain';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundPosition = 'center';
  element.style.backgroundColor = sprite?.fallback?.primary || '';
  const sources = collectSpriteSources(sprite, action);
  if (!sources.length) {
    return;
  }
  const image = new Image();
  let index = 0;
  const tryNext = () => {
    if (index >= sources.length) {
      return;
    }
    const candidate = sources[index];
    index += 1;
    image.onload = () => {
      element.style.backgroundImage = `url(${image.src})`;
      element.classList.add('has-image');
    };
    image.onerror = () => {
      tryNext();
    };
    image.src = candidate;
  };
  tryNext();
}

function defaultPosition(line, index, total) {
  const lineOffsets = { frontline: 0.34, midline: 0.26, backline: 0.18 };
  const base = lineOffsets[line] ?? 0.3;
  const centerBase = FIELD_WIDTH * base;
  const spacing = 110;
  const offset = (index - (total - 1) / 2) * spacing;
  return {
    x: centerBase + offset,
    y: { frontline: FIELD_HEIGHT * 0.34, midline: FIELD_HEIGHT * 0.54, backline: FIELD_HEIGHT * 0.74 }[line] ||
      FIELD_HEIGHT * 0.5,
  };
}

function toStylePosition(position) {
  const halfWidth = FIELD_WIDTH / 2;
  const xPercent = Math.max(0, Math.min(halfWidth, position.x)) / halfWidth * 100;
  const yPercent = Math.max(0, Math.min(FIELD_HEIGHT, position.y)) / FIELD_HEIGHT * 100;
  return { xPercent, yPercent };
}

function renderEncounterPreview(encounter) {
  const wrapper = el('div', { className: 'encounter-preview embedded' });
  const title = el('h3', { text: '예상 적 편성' });
  attachTooltip(
    title,
    () =>
      encounter
        ? `라운드 ${encounter.round} 예상 적 ${encounter.enemies.length}명`
        : '정찰 정보가 수집되는 중입니다. 전투를 시작하면 최신 정보로 갱신됩니다.',
    { anchor: 'element' }
  );
  wrapper.appendChild(title);

  if (!encounter) {
    return wrapper;
  }

  const board = el('div', { className: 'encounter-preview-board map-layout' });
  if (encounter.background?.src) {
    board.style.backgroundImage = `url(${encounter.background.src})`;
    board.classList.add('has-image');
  } else if (encounter.background?.fallbackColor) {
    board.style.backgroundColor = encounter.background.fallbackColor;
  }
  board.appendChild(el('div', { className: 'encounter-center-line' }));

  encounter.enemies.forEach((enemy) => {
    const token = el('div', { className: 'encounter-token map-token' });
    token.title = enemy.name;
    applySpritePreview(token, enemy.sprite);
    const job = enemy.jobId ? getJobById(enemy.jobId) : null;
    attachTooltip(token, () =>
      buildUnitTooltip({
        name: enemy.name,
        jobName: job?.name,
        role: enemy.role,
        rarity: enemy.rarity,
        stats: enemy.stats,
        skill: enemy.skill,
        level: enemy.level,
      })
    );
    token.appendChild(el('span', { className: 'encounter-token-name', text: enemy.name }));

    const percentX = Math.min(Math.max(enemy.x || FIELD_WIDTH * 0.7, 0), FIELD_WIDTH) / FIELD_WIDTH * 100;
    const percentY = Math.min(Math.max(enemy.y || FIELD_HEIGHT * 0.5, 0), FIELD_HEIGHT) / FIELD_HEIGHT * 100;
    token.style.left = `${percentX}%`;
    token.style.top = `${percentY}%`;
    board.appendChild(token);
  });

  if (!encounter.enemies.length) {
    board.appendChild(
      el('div', {
        className: 'encounter-empty map-note',
        text: '정찰된 적이 없습니다.',
      })
    );
  }

  wrapper.appendChild(board);
  return wrapper;
}

export function createPlacementBoard({ party, placements = {}, onChange, encounter = null }) {
  const boardWrapper = el('div', { className: 'card placement-card' });
  const placementTitle = el('h2', { className: 'section-title', text: '전투 배치' });
  attachTooltip(
    placementTitle,
    () => '전장을 드래그하여 전투원 시작 위치를 조정하세요. 배치 가능한 전투원은 최대 5명입니다.',
    { anchor: 'element' }
  );
  boardWrapper.appendChild(placementTitle);

  const layout = el('div', { className: 'placement-board-row' });
  const board = el('div', { className: 'placement-board' });
  layout.appendChild(board);
  layout.appendChild(renderEncounterPreview(encounter));
  boardWrapper.appendChild(layout);

  const tokens = [];
  const lines = ['frontline', 'midline', 'backline'];

  lines.forEach((lineKey) => {
    const units = party[lineKey].filter((slot) => slot.unit);
    units.forEach((slot, index) => {
      const unit = slot.unit;
      const placement = placements[unit.instanceId] || defaultPosition(lineKey, index, units.length);
      const definition = getUnitDefinition(unit.definitionId);
      const sprite = definition?.spriteId ? getSpriteById(definition.spriteId) : null;
      const token = el('div', { className: 'placement-token' });
      token.dataset.instanceId = unit.instanceId;
      applySpritePreview(token, sprite);
      const sourceDiameter = Number.isFinite(sprite?.geometry?.token?.diameter)
        ? sprite.geometry.token.diameter
        : TOKEN_DISPLAY_SIZE;
      const scale = sourceDiameter > 0 ? TOKEN_DISPLAY_SIZE / sourceDiameter : 1;
      const offsetX = Number.isFinite(sprite?.geometry?.token?.offsetX)
        ? sprite.geometry.token.offsetX * scale
        : 0;
      const offsetY = Number.isFinite(sprite?.geometry?.token?.offsetY)
        ? sprite.geometry.token.offsetY * scale
        : 0;
      token.style.width = `${TOKEN_DISPLAY_SIZE}px`;
      token.style.height = `${TOKEN_DISPLAY_SIZE}px`;
      token.style.marginLeft = `${-(TOKEN_DISPLAY_SIZE / 2) + offsetX}px`;
      token.style.marginTop = `${-(TOKEN_DISPLAY_SIZE / 2) + offsetY}px`;
      const job = definition?.jobId ? getJobById(definition.jobId) : null;
      attachTooltip(token, () => {
        const base = unit.currentStats || buildBaseStats(definition);
        const applied = applyItemBonuses(base, unit.items || []);
        const displayStats = applied.stats;
        return buildUnitTooltip({
          name: definition?.name,
          jobName: job?.name,
          role: job?.role,
          rarity: definition?.rarity,
          stats: displayStats,
          baseStats: base,
          skill: definition ? getUnitSkill(definition.id, unit.level || 1) : null,
          level: unit.level,
          items: summarizeUnitItems(unit),
        });
      });
      token.appendChild(el('span', { className: 'token-label', text: definition?.name || 'Unit' }));

      const { xPercent, yPercent } = toStylePosition(placement);
      token.style.left = `${xPercent}%`;
      token.style.top = `${yPercent}%`;

      const handlePointerMove = (event) => {
        const rect = board.getBoundingClientRect();
        const relX = event.clientX - rect.left;
        const relY = event.clientY - rect.top;
        const clampedX = Math.max(0, Math.min(relX, rect.width));
        const clampedY = Math.max(0, Math.min(relY, rect.height));
        const percentX = (clampedX / rect.width) * 100;
        const percentY = (clampedY / rect.height) * 100;
        token.style.left = `${percentX}%`;
        token.style.top = `${percentY}%`;
      };

      const commitPosition = (event) => {
        token.releasePointerCapture(event.pointerId);
        token.removeEventListener('pointermove', handlePointerMove);
        token.removeEventListener('pointerup', commitPosition);
        token.removeEventListener('pointercancel', commitPosition);
        const rect = board.getBoundingClientRect();
        const relX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
        const relY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
        const position = {
          x: (relX / rect.width) * (FIELD_WIDTH / 2),
          y: (relY / rect.height) * FIELD_HEIGHT,
        };
        if (typeof onChange === 'function') {
          onChange(unit.instanceId, position);
        }
      };

      token.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        token.setPointerCapture(event.pointerId);
        token.addEventListener('pointermove', handlePointerMove);
        token.addEventListener('pointerup', commitPosition);
        token.addEventListener('pointercancel', commitPosition);
      });

      board.appendChild(token);
      tokens.push(token);
    });
  });

  if (tokens.length === 0) {
    board.appendChild(el('div', { className: 'empty-state', text: '전투에 배치된 유닛이 없습니다.' }));
  }

  return boardWrapper;
}
