import { getRarityColor, getShortName } from './identity.js';

function cloneUnit(unit) {
  return {
    ...unit,
    health: unit.maxHealth,
    mana: unit.maxMana ?? unit.mana ?? 0,
    flashTimer: 0,
    fallen: false,
    targetX: unit.x,
    targetY: unit.y,
    spawnX: unit.x,
    spawnY: unit.y,
    skillTimer: unit.skillTimer,
    skillCooldownRemaining: typeof unit.skillTimer === 'number' ? unit.skillTimer : 0,
    skillCooldownMax: Math.max(
      typeof unit.skillTimer === 'number' ? unit.skillTimer : 0,
      unit.skill?.cooldown || 0
    ),
    items: Array.isArray(unit.items) ? unit.items.map((item) => ({ ...item })) : [],
    currentSpriteKey: null,
    currentSpriteTimer: 0,
    defaultSpriteKey: null,
    statusEffects: [],
  };
}

function darkenColor(hex, factor = 0.25) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return '#203020';
  }
  const normalized = hex.slice(1);
  if (normalized.length !== 6) {
    return hex;
  }
  const value = parseInt(normalized, 16);
  const clamp = (channel) => Math.max(0, Math.min(255, Math.round(channel)));
  const ratio = Math.max(0, Math.min(1, factor));
  const r = clamp(((value >> 16) & 0xff) * (1 - ratio));
  const g = clamp(((value >> 8) & 0xff) * (1 - ratio));
  const b = clamp((value & 0xff) * (1 - ratio));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

const STATUS_COLOR_MAP = {
  haste: '#ffd966',
  fury: '#ff9b42',
  fortify: '#7fb8ff',
  valor: '#8ef2c0',
  ward: '#9ad6ff',
  shield: '#b7d7ff',
  regen: '#7df17d',
  focus: '#c59bff',
  slow: '#7cb2ff',
  stun: '#f6b042',
  fear: '#a97bff',
  exposed: '#ff7d7d',
  weaken: '#ff9bd6',
  burn: '#ff6b4a',
  void: '#b783ff',
  curse: '#d269ff',
  healcut: '#ff96ad',
  wardbreak: '#9ab9ff',
};

const STATUS_LABEL_MAP = {
  haste: '가속',
  fury: '분노',
  fortify: '수비',
  valor: '격려',
  ward: '보호',
  shield: '보호막',
  regen: '재생',
  focus: '집중',
  slow: '감속',
  stun: '기절',
  fear: '공포',
  exposed: '취약',
  weaken: '약화',
  burn: '화상',
  void: '침식',
  curse: '저주',
  healcut: '치유 저하',
  wardbreak: '보호 약화',
};

const BUFF_AURA_COLOR = 'rgba(125, 241, 125, 0.55)';
const DEBUFF_AURA_COLOR = 'rgba(255, 125, 125, 0.55)';

function resolveTokenOffsets(unit) {
  const geometry = unit?.sprite?.geometry;
  const offsetX = Number.isFinite(unit?.tokenOffsetX)
    ? unit.tokenOffsetX
    : Number.isFinite(geometry?.token?.offsetX)
    ? geometry.token.offsetX
    : 0;
  const offsetY = Number.isFinite(unit?.tokenOffsetY)
    ? unit.tokenOffsetY
    : Number.isFinite(geometry?.token?.offsetY)
    ? geometry.token.offsetY
    : 0;
  return { x: offsetX, y: offsetY };
}

function isImageReady(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

const SPRITE_TARGET_SIZE = 48;

function ensureSpriteMetrics(unit, image) {
  if (!unit) {
    return null;
  }
  if (unit.spriteMetrics?.locked) {
    return unit.spriteMetrics;
  }

  const geometry = unit.sprite?.geometry || {};
  const existing = unit.spriteMetrics || {};
  const imageReady = isImageReady(image);

  const fallbackWidth = imageReady
    ? image.naturalWidth
    : existing.baseWidth || SPRITE_TARGET_SIZE;
  const fallbackHeight = imageReady
    ? image.naturalHeight
    : existing.baseHeight || SPRITE_TARGET_SIZE;

  const baseWidth =
    Number.isFinite(geometry.width) && geometry.width > 0 ? geometry.width : fallbackWidth || SPRITE_TARGET_SIZE;
  const baseHeight =
    Number.isFinite(geometry.height) && geometry.height > 0 ? geometry.height : fallbackHeight || SPRITE_TARGET_SIZE;

  const anchorX = Number.isFinite(geometry.anchor?.x) ? geometry.anchor.x : baseWidth / 2;
  const anchorY = Number.isFinite(geometry.anchor?.y) ? geometry.anchor.y : baseHeight;
  const offsetX = Number.isFinite(geometry.offsetX) ? geometry.offsetX : 0;
  const offsetY = Number.isFinite(geometry.offsetY) ? geometry.offsetY : 0;

  const unitRadius = Number.isFinite(unit.radius) && unit.radius > 0 ? unit.radius : null;
  const geometryHeight =
    Number.isFinite(geometry.displayHeight) && geometry.displayHeight > 0 ? geometry.displayHeight : null;
  let targetHeight = unitRadius ? unitRadius * 2 : null;
  if (geometryHeight && (!targetHeight || geometryHeight < targetHeight)) {
    targetHeight = geometryHeight;
  }
  if (!targetHeight) {
    targetHeight = SPRITE_TARGET_SIZE;
  }

  const normalizedBaseHeight = baseHeight > 0 ? baseHeight : 1;
  const aspectRatio = baseWidth > 0 ? baseWidth / normalizedBaseHeight : 1;
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const targetWidth = targetHeight * safeAspect;

  const metrics = {
    baseWidth,
    baseHeight: baseHeight || 1,
    anchorX,
    anchorY,
    offsetX,
    offsetY,
    displayHeight: targetHeight,
    displayWidth: targetWidth,
    locked: true,
  };

  unit.spriteMetrics = metrics;
  return metrics;
}

function drawTextWithOutline(ctx, text, x, y, options = {}) {
  if (!ctx || typeof text !== 'string') {
    return;
  }
  const {
    fillStyle,
    strokeStyle = 'rgba(15, 24, 39, 0.8)',
    lineWidth = 3,
    textAlign,
    textBaseline,
    shadowColor,
    shadowBlur,
  } = options;

  ctx.save();
  if (textAlign) {
    ctx.textAlign = textAlign;
  }
  if (textBaseline) {
    ctx.textBaseline = textBaseline;
  }
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.strokeText(text, x, y);
  }
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur ?? 0;
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

export class BattlefieldRenderer {
  constructor(canvas, outcome, audioManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audioManager;
    this.field = outcome.field;
    this.units = {};
    this.drawOrder = [];
    this.imageCache = new Map();
    this.background = this.field?.background || null;
    this.backgroundImage = this.background?.src ? this.getImage(this.background.src) : null;
    this.backgroundTint = this.background?.fallbackColor || null;
    this.animationBursts = [];
    this.areaIndicators = [];
    [...outcome.combatants.allies, ...outcome.combatants.enemies].forEach((unit) => {
      const clone = cloneUnit(unit);
      if (Array.isArray(clone.sprite?.sources) && clone.sprite.sources.length) {
        const key = clone.sprite?.id
          ? `sprite:${clone.sprite.id}:idle`
          : `sprite:${clone.definitionId}:idle`;
        clone.spriteImage = this.getImageFromSources(clone.sprite.sources, key);
      } else if (clone.sprite?.src) {
        clone.spriteImage = this.getImage(clone.sprite.src);
      }
      if (clone.animations) {
        clone.animationImages = {};
        Object.entries(clone.animations).forEach(([key, src]) => {
          const variantSources = Array.isArray(clone.sprite?.variantSources?.[key])
            ? clone.sprite.variantSources[key]
            : null;
          if (variantSources && variantSources.length) {
            const cacheKey = clone.sprite?.id
              ? `sprite:${clone.sprite.id}:${key}`
              : `sprite:${clone.definitionId}:${key}`;
            clone.animationImages[key] = this.getImageFromSources(variantSources, cacheKey);
          } else if (src) {
            clone.animationImages[key] = this.getImage(src);
          }
        });
        const keys = Object.keys(clone.animationImages);
        if (keys.length > 0) {
          const preferred = clone.animationImages.idle
            ? 'idle'
            : clone.animationImages.move
            ? 'move'
            : clone.animationImages.attack
            ? 'attack'
            : keys[0];
          clone.defaultSpriteKey = preferred;
          clone.currentSpriteKey = preferred;
        }
      }
      clone.facingLeft = clone.side === 'enemies';
      clone.lastX = clone.x;
      this.units[clone.id] = clone;
      this.drawOrder.push(clone);
    });
    this.events = outcome.events
      .slice()
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    this.currentIndex = 0;
    this.lastTimestamp = 0;
    this.running = false;
    this.onComplete = null;
    this.drawOrder.sort((a, b) => a.y - b.y);
    this.playbackRate = 1;
    this.playbackTime = 0;
    this.activeBursts = [];
    this.skillLabels = [];
    this.floatTexts = [];
    this.skillSlowEnabled = true;
    this.skillSlowDuration = 1.2;
    this.skillSlowFactor = 0.4;
    this.slowdownTimer = 0;
    this.statusCounter = 0;
  }

  getImage(src) {
    if (!src) {
      return null;
    }
    if (!this.imageCache.has(src)) {
      const image = new Image();
      image.src = src;
      this.imageCache.set(src, image);
    }
    return this.imageCache.get(src) || null;
  }

  getImageFromSources(sources, cacheKeyHint = '') {
    if (!Array.isArray(sources)) {
      return this.getImage(sources);
    }
    const filtered = sources.filter(Boolean);
    if (!filtered.length) {
      return null;
    }
    const hint = cacheKeyHint ? `${cacheKeyHint}|` : '';
    const key = `${hint}${filtered.join('|')}`;
    if (this.imageCache.has(key)) {
      return this.imageCache.get(key);
    }
    const image = new Image();
    let index = 0;
    const tryNext = () => {
      if (index >= filtered.length) {
        return;
      }
      const candidate = filtered[index];
      index += 1;
      image.src = candidate;
    };
    image.onerror = () => {
      tryNext();
    };
    this.imageCache.set(key, image);
    tryNext();
    return image;
  }

  start(onComplete) {
    if (this.running) {
      return;
    }
    this.onComplete = onComplete;
    this.running = true;
    this.setPlaybackRate(1);
    this.playbackTime = 0;
    this.currentIndex = 0;
    this.activeBursts = [];
    this.animationBursts = [];
    this.areaIndicators = [];
    this.skillLabels = [];
    this.floatTexts = [];
    this.slowdownTimer = 0;
    Object.values(this.units).forEach((unit) => {
      unit.health = unit.maxHealth;
      unit.mana = unit.maxMana ?? unit.mana ?? 0;
      unit.x = unit.spawnX;
      unit.y = unit.spawnY;
      unit.targetX = unit.spawnX;
      unit.targetY = unit.spawnY;
      unit.flashTimer = 0;
      unit.fallen = false;
      unit.skillCooldownRemaining = typeof unit.skillTimer === 'number'
        ? unit.skillTimer
        : unit.skillCooldownMax || 0;
      if (!unit.skillCooldownMax || unit.skillCooldownMax < unit.skillCooldownRemaining) {
        unit.skillCooldownMax = Math.max(unit.skillCooldownRemaining, unit.skillCooldownMax || 0);
      }
      unit.lastX = unit.x;
      unit.currentSpriteKey = unit.defaultSpriteKey;
      unit.currentSpriteTimer = 0;
      unit.statusEffects = [];
    });
    this.statusCounter = 0;
    this.lastTimestamp = performance.now();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  stop() {
    this.running = false;
  }

  togglePlaybackRate() {
    const next = this.playbackRate >= 2 ? 1 : 2;
    return this.setPlaybackRate(next);
  }

  setPlaybackRate(rate) {
    const numeric = Number(rate);
    if (!Number.isFinite(numeric)) {
      this.playbackRate = 1;
      return this.playbackRate;
    }
    this.playbackRate = Math.max(0.5, Math.min(4, numeric));
    return this.playbackRate;
  }

  setSkillSlowEnabled(enabled) {
    this.skillSlowEnabled = !!enabled;
    if (!this.skillSlowEnabled) {
      this.slowdownTimer = 0;
    }
    return this.skillSlowEnabled;
  }

  triggerSkillSlowdown() {
    if (!this.skillSlowEnabled) {
      return;
    }
    this.slowdownTimer = Math.max(this.skillSlowDuration, this.slowdownTimer);
  }

  update(deltaMs) {
    let seconds = deltaMs / 1000;
    let rate = this.playbackRate;
    if (this.skillSlowEnabled && this.slowdownTimer > 0 && this.skillSlowDuration > 0) {
      const ratio = Math.max(0, Math.min(1, this.slowdownTimer / this.skillSlowDuration));
      const slowFactor = this.skillSlowFactor + (1 - this.skillSlowFactor) * (1 - ratio);
      rate *= slowFactor;
      this.slowdownTimer = Math.max(0, this.slowdownTimer - seconds);
    }
    const deltaSeconds = seconds * rate;
    this.playbackTime += deltaSeconds;

    this.drawOrder.forEach((unit) => {
      if (unit.flashTimer > 0) {
        unit.flashTimer = Math.max(0, unit.flashTimer - deltaMs);
      }
      if (unit.health <= 0 && !unit.fallen) {
        unit.fallen = true;
      }
      if (typeof unit.skillCooldownRemaining === 'number' && unit.skillCooldownRemaining > 0) {
        unit.skillCooldownRemaining = Math.max(
          0,
          unit.skillCooldownRemaining - deltaSeconds
        );
      }
      if (unit.currentSpriteTimer > 0) {
        unit.currentSpriteTimer = Math.max(0, unit.currentSpriteTimer - deltaSeconds);
        if (unit.currentSpriteTimer === 0) {
          unit.currentSpriteKey = unit.defaultSpriteKey;
        }
      } else if (!unit.currentSpriteKey && unit.defaultSpriteKey) {
        unit.currentSpriteKey = unit.defaultSpriteKey;
      }
      if (unit.statusEffects?.length) {
        const nextStatuses = [];
        unit.statusEffects.forEach((status) => {
          if (!status) {
            return;
          }
          const remaining = Math.max(0, (status.remaining ?? 0) - deltaSeconds);
          if (remaining > 0.05) {
            status.remaining = remaining;
            nextStatuses.push(status);
          }
        });
        unit.statusEffects = nextStatuses;
      }
      if (unit.health <= 0 && unit.statusEffects?.length) {
        unit.statusEffects = [];
      }
    });

    while (this.currentIndex < this.events.length && this.events[this.currentIndex].timestamp <= this.playbackTime) {
      const nextEvent = this.events[this.currentIndex];
      this.currentIndex += 1;
      this.enqueueEvent(nextEvent);
    }

    this.activeBursts = this.activeBursts.filter((burst) => {
      burst.elapsed += deltaSeconds;
      if (!burst.applied && burst.elapsed >= burst.meta.hit) {
        this.applyBurstEffect(burst);
      }
      return burst.elapsed < burst.meta.duration;
    });

    this.animationBursts = this.animationBursts.filter((fx) => {
      fx.elapsed += deltaSeconds;
      return fx.elapsed < fx.duration;
    });

    this.areaIndicators = this.areaIndicators.filter((indicator) => {
      indicator.elapsed += deltaSeconds;
      return indicator.elapsed < indicator.duration;
    });

    this.skillLabels = this.skillLabels.filter((label) => {
      label.elapsed += deltaSeconds;
      return label.elapsed < label.duration;
    });

    this.floatTexts = this.floatTexts.filter((floater) => {
      floater.elapsed += deltaSeconds;
      return floater.elapsed < floater.duration;
    });
  }

  enqueueEvent(event) {
    if (event?.kind === 'status') {
      const targets = Array.isArray(event.targetIds) ? event.targetIds : [];
      targets.forEach((unitId) => {
        const unit = this.units[unitId];
        if (!unit) {
          return;
        }
        if (!Array.isArray(unit.statusEffects)) {
          unit.statusEffects = [];
        }
        const statusKind = event.statusKind || 'buff';
        const effectType = event.effectType || (statusKind === 'debuff' ? 'debuff' : 'buff');
        const duration = Number.isFinite(event.duration) ? Math.max(0, event.duration) : 0;
        if (duration <= 0) {
          unit.statusEffects = unit.statusEffects.filter(
            (status) => !(status.kind === statusKind && status.effectType === effectType)
          );
          return;
        }
        const existing = unit.statusEffects.find(
          (status) => status.kind === statusKind && status.effectType === effectType
        );
        if (existing) {
          existing.remaining = Math.max(existing.remaining, duration);
          existing.total = Math.max(existing.total || 0, duration);
        } else {
          unit.statusEffects.push({
            id: `status-${(this.statusCounter += 1)}`,
            kind: statusKind,
            effectType,
            remaining: duration,
            total: duration,
          });
        }
      });
      return;
    }
    if (event?.kind === 'area' && event.area) {
      const unit = event.attackerId ? this.units[event.attackerId] : null;
      const color = event.area.color
        || (unit?.side === 'allies' ? 'rgba(142, 210, 255, 0.9)' : 'rgba(255, 164, 142, 0.9)');
      this.areaIndicators.push({
        x: event.area.x,
        y: event.area.y,
        radius: event.area.radius || 60,
        color,
        duration: Math.max(0.2, event.area.duration || 0.8),
        elapsed: 0,
      });
      return;
    }

    this.queueAnimation(event);

    if (event.positionUpdates) {
      Object.entries(event.positionUpdates).forEach(([unitId, position]) => {
        const unit = this.units[unitId];
        if (unit && position) {
          unit.targetX = position.x;
          unit.targetY = position.y;
          if (typeof position.x === 'number') {
            if (position.x < unit.x - 1) {
              unit.facingLeft = true;
            } else if (position.x > unit.x + 1) {
              unit.facingLeft = false;
            }
          }
        }
      });
    }

    const meta = {
      attack: { duration: 0.6, hit: 0.28 },
      heal: { duration: 0.6, hit: 0.3 },
      ability: { duration: 0.9, hit: 0.35 },
      shield: { duration: 0.6, hit: 0.3 },
      move: { duration: 0.24, hit: 0 },
    }[event.kind] || { duration: 0.5, hit: 0.25 };

    if (event.kind === 'move') {
      return;
    }

    this.activeBursts.push({
      event,
      elapsed: 0,
      applied: false,
      meta,
    });

    if (event.attackerId) {
      const actor = this.units[event.attackerId];
      const target = this.units[event.targetIds?.[0]];
      if (actor && target) {
        actor.facingLeft = target.x < actor.x;
      }
      if (event.kind === 'ability' && event.skillName && actor?.side === 'allies') {
        this.skillLabels.push({
          unitId: event.attackerId,
          text: event.skillName,
          elapsed: 0,
          duration: 1.6,
        });
      }
      if (event.kind === 'ability') {
        this.triggerSkillSlowdown();
      }
    }
  }

  spawnAnimation(unitId, key, duration = 0.6) {
    const unit = this.units[unitId];
    this.animationBursts.push({
      unitId,
      key,
      image: unit?.animationImages?.[key] || null,
      elapsed: 0,
      duration,
    });
    if (unit) {
      const hasImage = !!unit.animationImages?.[key];
      const resolvedKey = hasImage ? key : unit.defaultSpriteKey;
      if (resolvedKey) {
        unit.currentSpriteKey = resolvedKey;
        const baseDuration = duration || 0.6;
        const holdTime = key === 'move' ? Math.max(0.18, baseDuration * 0.5) : Math.max(0.35, baseDuration);
        unit.currentSpriteTimer = Math.max(unit.currentSpriteTimer, holdTime);
      } else {
        unit.currentSpriteKey = null;
        unit.currentSpriteTimer = 0;
      }
    }
  }

  queueAnimation(event) {
    if (event.kind === 'status') {
      return;
    }
    if (event.kind === 'move') {
      Object.keys(event.positionUpdates || {}).forEach((unitId) => {
        this.spawnAnimation(unitId, 'move', 0.35);
      });
      return;
    }
    const actorId = event.attackerId;
    if (!actorId) {
      return;
    }
    if (event.kind === 'attack') {
      this.spawnAnimation(actorId, 'attack', 0.5);
      return;
    }
    if (['ability', 'heal', 'shield'].includes(event.kind)) {
      this.spawnAnimation(actorId, 'skill', 0.7);
      const actor = this.units[actorId];
      if (actor && typeof event.cooldownDuration === 'number') {
        actor.skillCooldownRemaining = event.cooldownDuration;
        const base = event.baseCooldown || event.cooldownDuration;
        actor.skillCooldownMax = Math.max(base, event.cooldownDuration, actor.skillCooldownMax || 0.01);
        actor.skillTimer = event.cooldownDuration;
      }
    }
  }

  addCombatNumber(unit, amount, kind) {
    if (!unit || !Number.isFinite(amount)) {
      return;
    }
    const rounded = Math.abs(Math.round(amount));
    const prefix = kind === 'heal' ? '+' : '-';
    const color = kind === 'heal' ? '#7df17d' : '#ff9b7d';
    const text = rounded === 0 ? '0' : `${prefix}${rounded}`;
    this.floatTexts.push({
      unitId: unit.id,
      x: unit.x,
      y: unit.y,
      text,
      color,
      elapsed: 0,
      duration: 1.2,
    });
  }

  applyBurstEffect(burst) {
    burst.applied = true;
    const event = burst.event;
    if (event.kind === 'attack' || event.kind === 'shield') {
      const target = this.units[event.targetIds?.[0]];
      if (target && typeof event.remainingHealth === 'number') {
        target.health = event.remainingHealth;
        target.flashTimer = 320;
        if (target.health <= 0) {
          target.fallen = true;
        }
        if (event.kind === 'attack' && typeof event.amount === 'number') {
          this.addCombatNumber(target, event.amount, 'attack');
        }
      }
      if (this.audio) {
        this.audio.playHit();
      }
    }
    if (event.kind === 'heal') {
      const target = this.units[event.targetIds?.[0]];
      if (target && typeof event.remainingHealth === 'number') {
        target.health = event.remainingHealth;
        target.flashTimer = 320;
        if (typeof event.amount === 'number') {
          this.addCombatNumber(target, event.amount, 'heal');
        }
      }
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    const { width, height } = this.canvas;
    const image = this.backgroundImage;
    if (image?.complete && image?.naturalWidth > 0) {
      ctx.drawImage(image, 0, 0, width, height);
    } else {
      const base = this.backgroundTint || '#9ddc79';
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, base);
      gradient.addColorStop(1, darkenColor(base, 0.35));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(width * 0.48, 0, width * 0.04, height);
  }

  drawUnit(unit) {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    if (unit.side === 'enemies' && unit.health <= 0) {
      return;
    }
    const activeStatuses = Array.isArray(unit.statusEffects)
      ? unit.statusEffects.filter((status) => status && status.remaining > 0.05)
      : [];
    const hasBuffAura = activeStatuses.some((status) => status.kind === 'buff');
    const hasDebuffAura = activeStatuses.some((status) => status.kind === 'debuff');
    if (hasBuffAura || hasDebuffAura) {
      const time = this.playbackTime || 0;
      const pulse = 1 + 0.05 * Math.sin(time * 6 + unit.x * 0.02);
      const auraRadius = unit.radius * (1.35 * pulse);
      if (hasDebuffAura) {
        ctx.save();
        ctx.strokeStyle = DEBUFF_AURA_COLOR;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (hasBuffAura) {
        ctx.save();
        ctx.strokeStyle = BUFF_AURA_COLOR;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, auraRadius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    const opacity = unit.health > 0 ? 1 : 0.2;
    const activeSprite =
      unit.currentSpriteKey && unit.animationImages?.[unit.currentSpriteKey]
        ? unit.animationImages[unit.currentSpriteKey]
        : null;
    const spriteImage = activeSprite || unit.spriteImage;
    const hasSprite = spriteImage?.complete && spriteImage?.naturalWidth > 0;
    const tokenOffsets = resolveTokenOffsets(unit);
    const primaryColor = unit.sprite?.fallback?.primary || unit.color || '#5f6f7a';
    const accentColor = unit.sprite?.fallback?.accent || '#203020';

    const isAttacking = this.isAttacking(unit.id);
    const isFlashing = unit.flashTimer > 0;

    ctx.save();
    ctx.globalAlpha = opacity;
    if (hasSprite) {
      if (isAttacking) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ffee99';
      } else if (isFlashing) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(30, 38, 56, 0.45)';
      }
      ctx.translate(unit.x, unit.y);
      if (unit.facingLeft) {
        ctx.scale(-1, 1);
      }
      const metrics = ensureSpriteMetrics(unit, spriteImage) || {};
      const baseWidth = metrics.baseWidth || spriteImage.naturalWidth || SPRITE_TARGET_SIZE;
      const baseHeight = metrics.baseHeight || spriteImage.naturalHeight || SPRITE_TARGET_SIZE;
      const drawWidth = metrics.displayWidth || SPRITE_TARGET_SIZE;
      const drawHeight = metrics.displayHeight || SPRITE_TARGET_SIZE;
      const anchorX = Number.isFinite(metrics.anchorX) ? metrics.anchorX : baseWidth / 2;
      const anchorY = Number.isFinite(metrics.anchorY) ? metrics.anchorY : baseHeight;
      const offsetX = Number.isFinite(metrics.offsetX) ? metrics.offsetX : 0;
      const offsetY = Number.isFinite(metrics.offsetY) ? metrics.offsetY : 0;
      const anchorScaleX = drawWidth / (baseWidth || 1);
      const anchorScaleY = drawHeight / (baseHeight || 1);
      const scaledAnchorX = anchorX * anchorScaleX;
      const scaledAnchorY = anchorY * anchorScaleY;
      const scaledOffsetX = offsetX * anchorScaleX;
      const scaledOffsetY = offsetY * anchorScaleY;
      const drawX = -scaledAnchorX + scaledOffsetX + tokenOffsets.x;
      const drawY = -scaledAnchorY + scaledOffsetY + unit.radius + tokenOffsets.y;
      ctx.drawImage(spriteImage, drawX, drawY, drawWidth, drawHeight);
    } else {
      if (isAttacking) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffee99';
      } else if (isFlashing) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ffffff';
      }
      ctx.beginPath();
      ctx.fillStyle = primaryColor;
      ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    const barWidth = unit.radius * 2;
    const barHeight = 6;
    const barX = unit.x - unit.radius;
    const barY = unit.y + unit.radius + tokenOffsets.y + 6;
    const nameY = barY - 4;
    const statusesToDisplay = activeStatuses
      .slice()
      .sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === 'debuff' ? -1 : 1;
        }
        return (b.remaining || 0) - (a.remaining || 0);
      })
      .slice(0, 3);

    const name = getShortName(unit.name) || '전투원';
    const nameColor = getRarityColor(unit.rarity);
    ctx.save();
    ctx.textAlign = 'center';
    if (statusesToDisplay.length) {
      ctx.font = '10px sans-serif';
      statusesToDisplay.forEach((status, index) => {
        const color = STATUS_COLOR_MAP[status.effectType] || (status.kind === 'debuff' ? '#ff7d7d' : '#7df17d');
        const label = STATUS_LABEL_MAP[status.effectType] || (status.kind === 'debuff' ? '약화' : '강화');
        const remaining = status.remaining ?? 0;
        const text = `${label} ${remaining.toFixed(1)}s`;
        const textMetrics = ctx.measureText(text);
        const padding = 5;
        const width = textMetrics.width + padding * 2;
        const y = nameY - 12 - index * 14;
        ctx.fillStyle = 'rgba(14, 20, 31, 0.8)';
        ctx.fillRect(unit.x - width / 2, y - 10, width, 12);
        ctx.fillStyle = color;
        ctx.fillRect(unit.x - width / 2 + 1, y - 9, width - 2, 10);
        drawTextWithOutline(ctx, text, unit.x, y, {
          fillStyle: '#0a101a',
          strokeStyle: 'rgba(250, 252, 255, 0.45)',
          lineWidth: 1.5,
        });
      });
    }
    ctx.font = '12px sans-serif';
    drawTextWithOutline(ctx, name, unit.x, nameY, {
      fillStyle: nameColor,
      strokeStyle: 'rgba(10, 16, 26, 0.8)',
      lineWidth: 2.4,
    });

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const pct = Math.max(0, Math.min(1, unit.health / unit.maxHealth));
    ctx.fillStyle = unit.side === 'allies' ? '#7df17d' : '#ff7d7d';
    ctx.fillRect(barX, barY, barWidth * pct, barHeight);
    const shieldAmount = Math.max(0, unit.shield || 0);
    if (shieldAmount > 0 && unit.maxHealth > 0) {
      const maxHealthValue = unit.maxHealth;
      const currentHealthRatio = Math.max(0, Math.min(1, unit.health / maxHealthValue));
      const shieldOverHealth = Math.min(unit.health, shieldAmount);
      const shieldHealthRatio = shieldOverHealth / maxHealthValue;
      if (shieldHealthRatio > 0) {
        const start = Math.max(0, currentHealthRatio - shieldHealthRatio);
        const width = Math.min(shieldHealthRatio, currentHealthRatio);
        if (width > 0) {
          ctx.fillStyle = 'rgba(177, 205, 255, 0.85)';
          ctx.fillRect(barX + barWidth * start, barY, barWidth * width, barHeight);
        }
      }
      const shieldFillingMissing = Math.max(0, Math.min(shieldAmount - shieldOverHealth, maxHealthValue - unit.health));
      const missingRatio = shieldFillingMissing / maxHealthValue;
      if (missingRatio > 0) {
        const start = currentHealthRatio;
        const width = Math.min(missingRatio, Math.max(0, 1 - start));
        if (width > 0) {
          ctx.fillStyle = 'rgba(140, 182, 255, 0.65)';
          ctx.fillRect(barX + barWidth * start, barY, barWidth * width, barHeight);
        }
      }
      const overflowShield = Math.max(0, shieldAmount - shieldOverHealth - shieldFillingMissing);
      if (overflowShield > 0) {
        const overflowRatio = Math.min(1, overflowShield / maxHealthValue);
        if (overflowRatio > 0) {
          ctx.fillStyle = 'rgba(176, 205, 255, 0.7)';
          ctx.fillRect(barX, barY - 3, barWidth * overflowRatio, 2);
        }
      }
    }

    if (typeof unit.maxMana === 'number' && unit.maxMana > 0) {
      const manaValue = typeof unit.mana === 'number'
        ? unit.mana
        : typeof unit.currentMana === 'number'
          ? unit.currentMana
          : 0;
      const manaPct = Math.max(0, Math.min(1, manaValue / unit.maxMana));
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(barX, barY + barHeight + 2, barWidth, 4);
      ctx.fillStyle = '#4fa7ff';
      ctx.fillRect(barX, barY + barHeight + 2, barWidth * manaPct, 4);
    }
    if (unit.skillCooldownMax && unit.skillCooldownMax > 0.1) {
      const cooldownPct = unit.skillCooldownRemaining
        ? 1 - Math.max(0, Math.min(1, unit.skillCooldownRemaining / unit.skillCooldownMax))
        : 1;
      const cdY = barY + barHeight + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(barX, cdY, barWidth, 3);
      ctx.fillStyle = '#c59bff';
      ctx.fillRect(barX, cdY, barWidth * cooldownPct, 3);
      const remaining = unit.skillCooldownRemaining || 0;
      const label = remaining > 0.05 ? `${remaining.toFixed(1)}s` : '준비 완료';
      ctx.font = '9px sans-serif';
      drawTextWithOutline(ctx, label, unit.x, cdY + 10, {
        fillStyle: '#1b2432',
        strokeStyle: 'rgba(245, 249, 255, 0.6)',
        lineWidth: 1.4,
      });
    }
    ctx.restore();
  }

  drawAnimations() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.animationBursts.forEach((fx) => {
      const unit = this.units[fx.unitId];
      const image = fx.image;
      if (!unit) {
        return;
      }
      const progress = Math.min(1, fx.elapsed / fx.duration);
      const sizeMultiplier =
        fx.key === 'move' ? 1.9 : fx.key === 'attack' ? 2.4 : 2.8;
      const size = unit.radius * sizeMultiplier;
      const alpha = 1 - progress * 0.8;
      if (alpha <= 0) {
        return;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      if (image?.complete && image?.naturalWidth > 0) {
        ctx.drawImage(image, unit.x - size / 2, unit.y - size / 2, size, size);
      } else {
        const colors = {
          move: '#9fb3ff',
          attack: '#ffd966',
          skill: '#ffe8a6',
        };
        ctx.fillStyle = colors[fx.key] || '#ffe8a6';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawEffect() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.activeBursts.forEach((burst) => {
      if (!['attack', 'heal', 'ability', 'shield'].includes(burst.event.kind)) {
        return;
      }
      const attacker = this.units[burst.event.attackerId];
      const target = this.units[burst.event.targetIds?.[0]] || attacker;
      if (!attacker || !target) {
        return;
      }
      const progress = Math.min(1, burst.elapsed / burst.meta.duration);
      const tracerProgress = Math.min(1, progress / 0.65);
      ctx.save();
      const colorMap = {
        attack: attacker.side === 'allies' ? '#ffee99' : '#ff6666',
        heal: '#7df17d',
        ability: '#ffdd77',
        shield: '#c0d7ff',
      };
      ctx.strokeStyle = colorMap[burst.event.kind] || '#ffee99';
      ctx.lineWidth = burst.event.kind === 'ability' ? 6 : 4;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(attacker.x, attacker.y);
      const midX = attacker.x + (target.x - attacker.x) * tracerProgress;
      const midY = attacker.y + (target.y - attacker.y) * tracerProgress;
      ctx.lineTo(midX, midY);
      ctx.stroke();
      if (burst.event.kind === 'ability') {
        ctx.beginPath();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = attacker.side === 'allies' ? '#fff3a6' : '#ffb3a6';
        ctx.arc(target.x, target.y, target.radius * (1.35 - progress * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawSkillLabels() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.skillLabels.forEach((label) => {
      const unit = this.units[label.unitId];
      if (!unit) {
        return;
      }
      const progress = Math.min(1, label.elapsed / label.duration);
      const alpha = Math.max(0, 1 - progress);
      const offset = unit.radius + resolveTokenOffsets(unit).y + 36;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      drawTextWithOutline(ctx, label.text, unit.x, unit.y - offset, {
        fillStyle: '#ffe9a6',
        strokeStyle: 'rgba(18, 24, 36, 0.65)',
        lineWidth: 3.5,
      });
      ctx.restore();
    });
  }

  drawFloatTexts() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.floatTexts.forEach((floater) => {
      const unit = this.units[floater.unitId];
      const baseX = unit ? unit.x : floater.x;
      const baseY = unit ? unit.y : floater.y;
      const radius = unit?.radius || 20;
      const tokenOffsetY = unit ? resolveTokenOffsets(unit).y : 0;
      const progress = Math.min(1, floater.elapsed / floater.duration);
      const offset = radius + tokenOffsetY + 26 + progress * 16;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      drawTextWithOutline(ctx, floater.text, baseX, baseY - offset, {
        fillStyle: floater.color,
        strokeStyle: 'rgba(18, 24, 32, 0.7)',
        lineWidth: 3,
      });
      ctx.restore();
    });
  }

  getUnits() {
    return this.drawOrder;
  }

  draw() {
    if (!this.ctx) {
      return;
    }
    this.drawBackground();
    this.drawAreaIndicators();
    this.drawOrder.forEach((unit) => {
      if (typeof unit.targetX === 'number' && typeof unit.targetY === 'number') {
        unit.x += (unit.targetX - unit.x) * 0.18 * this.playbackRate;
        unit.y += (unit.targetY - unit.y) * 0.18 * this.playbackRate;
      }
      if (typeof unit.lastX === 'number') {
        if (unit.x < unit.lastX - 0.5) {
          unit.facingLeft = true;
        } else if (unit.x > unit.lastX + 0.5) {
          unit.facingLeft = false;
        }
      }
      unit.lastX = unit.x;
      this.drawUnit(unit);
    });
    this.drawAnimations();
    this.drawEffect();
    this.drawSkillLabels();
    this.drawFloatTexts();
  }

  isAttacking(unitId) {
    return this.activeBursts.some((burst) => burst.event.attackerId === unitId);
  }

  loop(timestamp) {
    if (!this.running) {
      return;
    }
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.update(delta);
    this.draw();

    if (this.currentIndex >= this.events.length && this.activeBursts.length === 0) {
      this.running = false;
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }
    requestAnimationFrame((ts) => this.loop(ts));
  }

  drawAreaIndicators() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.areaIndicators.forEach((indicator) => {
      const progress = Math.min(1, indicator.elapsed / indicator.duration);
      const alpha = Math.max(0, 0.42 * (1 - progress));
      if (alpha <= 0) {
        return;
      }
      const radius = indicator.radius || 60;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = indicator.color || 'rgba(255, 224, 176, 0.92)';
      ctx.beginPath();
      ctx.arc(indicator.x, indicator.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.max(0, alpha * 1.35);
      ctx.strokeStyle = indicator.color || '#ffe8b5';
      ctx.stroke();
      ctx.restore();
    });
  }
}
