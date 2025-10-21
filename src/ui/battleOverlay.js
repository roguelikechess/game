import { el } from './dom.js';
import { BattlefieldRenderer } from './battlefield.js';
import { getTooltip } from './tooltip.js';
import { buildUnitTooltip } from './tooltipHelpers.js';
import { getJobById } from '../game/jobs.js';
import { describeItem } from '../game/items.js';

const SPEED_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
];

export function createBattleOverlay({
  outcome,
  round,
  onComplete,
  onSkip,
  onSpeedChange,
  initialSpeed = 1,
  audioManager,
}) {
  const overlay = el('div', { className: 'battle-overlay' });
  const inner = el('div', { className: 'battle-overlay-inner' });
  overlay.appendChild(inner);

  const header = el('div', { className: 'battle-overlay-header' });
  header.appendChild(
    el('h2', {
      text: round ? `라운드 ${round} 전투` : '전투 재생',
    })
  );
  inner.appendChild(header);

  const canvasWrapper = el('div', { className: 'battle-overlay-canvas' });
  const canvas = document.createElement('canvas');
  canvas.width = outcome.field?.width || 960;
  canvas.height = outcome.field?.height || 540;
  canvasWrapper.appendChild(canvas);
  inner.appendChild(canvasWrapper);

  const controls = el('div', { className: 'battle-overlay-controls' });
  const speedLabel = el('label', { className: 'speed-control' });
  speedLabel.appendChild(el('span', { text: '재생 속도' }));
  const speedSelect = el('select');
  SPEED_OPTIONS.forEach((option) => {
    const opt = el('option', { value: option.value, text: option.label });
    if (option.value === initialSpeed) {
      opt.selected = true;
    }
    speedSelect.appendChild(opt);
  });
  speedLabel.appendChild(speedSelect);
  controls.appendChild(speedLabel);

  let slowMotionEnabled = true;
  const slowToggle = el('button', {
    className: 'nav-button secondary slow-toggle',
    text: '슬로우 연출 켬',
  });
  controls.appendChild(slowToggle);

  const skipButton = el('button', { className: 'nav-button secondary', text: '결과 확인' });
  controls.appendChild(skipButton);
  inner.appendChild(controls);

  let finished = false;
  const renderer = new BattlefieldRenderer(canvas, outcome, audioManager);
  const tooltip = getTooltip();

  function updateSlowToggle() {
    slowToggle.textContent = slowMotionEnabled ? '슬로우 연출 켬' : '슬로우 연출 끔';
  }

  updateSlowToggle();
  renderer.setSkillSlowEnabled(slowMotionEnabled);

  function finish() {
    if (finished) {
      return;
    }
    tooltip.hide();
    finished = true;
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  skipButton.addEventListener('click', () => {
    renderer.stop();
    if (typeof onSkip === 'function') {
      onSkip();
    }
    finish();
  });

  speedSelect.addEventListener('change', (event) => {
    const applied = renderer.setPlaybackRate(Number(event.target.value));
    if (typeof onSpeedChange === 'function') {
      onSpeedChange(applied);
    }
  });

  slowToggle.addEventListener('click', () => {
    slowMotionEnabled = !slowMotionEnabled;
    renderer.setSkillSlowEnabled(slowMotionEnabled);
    updateSlowToggle();
  });

  renderer.start(() => {
    finish();
  });
  renderer.setPlaybackRate(initialSpeed);

  function buildStatsFromUnit(unit) {
    if (!unit) {
      return null;
    }
    if (unit.stats) {
      return unit.stats;
    }
    return {
      maxHealth: unit.maxHealth,
      health: unit.health,
      attack: unit.stats?.attack,
      defense: unit.stats?.defense,
      spellPower: unit.stats?.spellPower,
      speed: unit.stats?.speed,
      attackInterval: unit.stats?.attackInterval,
      maxMana: unit.maxMana,
      mana: unit.mana,
    };
  }

  function findUnitAtPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    let closest = null;
    let bestDist = Infinity;
    renderer.getUnits().forEach((unit) => {
      if (!unit || unit.side !== 'enemies') {
        return;
      }
      const dx = x - unit.x;
      const dy = y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= unit.radius * 1.2 && dist < bestDist) {
        closest = unit;
        bestDist = dist;
      }
    });
    return closest;
  }

  canvas.addEventListener('mousemove', (event) => {
    const unit = findUnitAtPosition(event);
    if (!unit) {
      tooltip.hide();
      return;
    }
    const job = unit.jobId ? getJobById(unit.jobId) : null;
    const battleStats = buildStatsFromUnit(unit);
    const content = buildUnitTooltip({
      name: unit.name,
      jobName: job?.name,
      role: unit.role,
      rarity: unit.rarity,
      stats: battleStats,
      baseStats: unit.baseStats || battleStats,
      skill: unit.skill,
      level: unit.level,
      items: Array.isArray(unit.items) ? unit.items.map((item) => describeItem(item)) : [],
    });
    tooltip.show(content, { x: event.clientX, y: event.clientY });
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hide();
  });

  return overlay;
}
