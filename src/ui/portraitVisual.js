import { el } from './dom.js';
import { getPortraitById } from '../data/assets.js';
import { getJobEmoji, getJobLabel, formatLevelBadge } from './identity.js';

function buildInitials(name) {
  if (!name) {
    return '??';
  }
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function applyPortraitAsset(element, asset, { placeholder = '' } = {}) {
  if (!element) {
    return;
  }
  element.classList.remove('has-image');
  element.style.backgroundImage = '';
  element.style.backgroundColor = asset?.fallback?.color || '';
  element.textContent = placeholder || '';

  const sourceList = Array.isArray(asset?.sources) && asset.sources.length
    ? asset.sources
    : asset?.src
    ? [asset.src]
    : [];
  const sources = Array.from(new Set(sourceList.filter(Boolean)));
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
      element.textContent = '';
    };
    image.onerror = () => {
      tryNext();
    };
    image.src = candidate;
  };

  tryNext();
}

export function createPortraitVisual({
  definition,
  level = 1,
  job = null,
  jobName,
  rarity,
  className = 'portrait-token',
  showMarkers = true,
  markerSize = 'small',
}) {
  const name = definition?.name || '???';
  const portraitAsset = definition?.portraitId ? getPortraitById(definition.portraitId) : null;

  const wrapper = el('div', { className: 'portrait-visual' });
  const portrait = el('div', { className });

  const placeholder = buildInitials(name);
  applyPortraitAsset(portrait, portraitAsset, { placeholder });

  wrapper.appendChild(portrait);

  let markers = null;
  if (showMarkers) {
    markers = el('div', { className: `portrait-marker-column marker-${markerSize}` });

    const levelInfo = formatLevelBadge(level);
    const levelBadge = el('div', {
      className: `portrait-marker level-marker marker-${markerSize}`,
      text: levelInfo.label,
    });
    levelBadge.title = levelInfo.title;
    markers.appendChild(levelBadge);

    const jobLabel = job ? getJobLabel(job) : jobName ? `❔ ${jobName}` : '❔ 미확인';
    const jobBadge = el('div', {
      className: `portrait-marker job-marker marker-${markerSize}`,
      text: jobLabel,
    });
    const emoji = job ? getJobEmoji(job) : '❔';
    jobBadge.title = `${emoji} ${jobName || job?.name || '직업 정보 없음'}`.trim();
    markers.appendChild(jobBadge);

    wrapper.appendChild(markers);
  }

  return {
    element: wrapper,
    portrait,
    markers,
  };
}
