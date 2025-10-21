const counters = new Map();

const hasStorage = typeof window !== 'undefined' && !!window.localStorage;

function storageKey(prefix) {
  return `chrono-vanguard-id-${prefix}`;
}

function loadCounter(prefix) {
  if (counters.has(prefix)) {
    return counters.get(prefix);
  }
  let value = 0;
  if (hasStorage) {
    try {
      const stored = window.localStorage.getItem(storageKey(prefix));
      if (stored) {
        const parsed = parseInt(stored, 36);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          value = parsed;
        }
      }
    } catch (error) {
      // ignore persistence errors
    }
  }
  counters.set(prefix, value);
  return value;
}

function saveCounter(prefix, value) {
  counters.set(prefix, value);
  if (hasStorage) {
    try {
      window.localStorage.setItem(storageKey(prefix), value.toString(36));
    } catch (error) {
      // ignore persistence errors
    }
  }
}

export function nanoid(prefix = 'id') {
  const next = loadCounter(prefix) + 1;
  saveCounter(prefix, next);
  return `${prefix}-${next.toString(36)}`;
}

export function ensureNanoidPrefixAtLeast(prefix, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return;
  }
  const current = loadCounter(prefix);
  if (value > current) {
    saveCounter(prefix, value);
  }
}

export function parseNanoid(id) {
  if (typeof id !== 'string') {
    return null;
  }
  const parts = id.split('-');
  if (parts.length !== 2) {
    return null;
  }
  const [prefix, raw] = parts;
  if (!prefix || !raw) {
    return null;
  }
  const numeric = parseInt(raw, 36);
  if (Number.isNaN(numeric) || numeric < 0) {
    return null;
  }
  return { prefix, value: numeric };
}
