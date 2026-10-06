export const STORAGE_KEY = 'arch101.v1';

const CARD_FIELDS = [
  'place', 'feel', 'people', 'boundary', 'movement',
  'light', 'material', 'city', 'sentence',
];

export function createState() {
  return { weeks: {}, finalVerdict: '' };
}

export function createWeekState() {
  return {
    done: { study: false, assignment: false, site: false },
    card: Object.fromEntries(CARD_FIELDS.map((key) => [key, ''])),
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

let memoryState = createState();
let hasUnsavedChanges = false;
const METADATA_KEY = `${STORAGE_KEY}.metadata`;
let metadata = {};

export function getSaveTimes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(METADATA_KEY));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) metadata = parsed;
  } catch {
    // Keep session timestamps if storage is unavailable.
  }
  return { ...metadata };
}

function recordTime(key) {
  metadata = { ...getSaveTimes(), [key]: new Date().toISOString() };
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch {
    // Timestamp persistence must not change the result of saving the data.
  }
}

export function recordBackup() {
  recordTime('backedUpAt');
}

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  memoryState = createState();
  hasUnsavedChanges = false;
  metadata = {};
  try {
    localStorage.removeItem(METADATA_KEY);
  } catch {
    // The progress data has already been deleted.
  }
  return true;
}

// Storage may be unavailable; retain a usable state for this session.
export function loadState() {
  if (hasUnsavedChanges) return memoryState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      memoryState = createState();
    } else {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        memoryState = {
          weeks: parsed.weeks && typeof parsed.weeks === 'object'
            && !Array.isArray(parsed.weeks) ? parsed.weeks : {},
          finalVerdict: typeof parsed.finalVerdict === 'string' ? parsed.finalVerdict : '',
        };
      }
    }
  } catch {
    // Unavailable storage or unreadable JSON must not prevent startup.
  }
  return memoryState;
}

export function saveState(state) {
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hasUnsavedChanges = false;
    recordTime('savedAt');
    return true;
  } catch {
    hasUnsavedChanges = true;
    return false;
  }
}

export function setWeekDone(weekNumber, key, checked) {
  if (!['study', 'assignment', 'site'].includes(key)) return false;
  const state = loadState();
  const previous = state.weeks[weekNumber];
  const week = { ...createWeekState(), ...previous };
  week.done = { ...week.done, [key]: checked === true };
  week.updatedAt = new Date().toISOString();
  state.weeks[weekNumber] = week;
  return saveState(state);
}

export function setWeekContent(weekNumber, card, notes) {
  const state = loadState();
  const week = { ...createWeekState(), ...state.weeks[weekNumber] };
  const changes = Object.fromEntries(
    CARD_FIELDS.filter((key) => typeof card[key] === 'string').map((key) => [key, card[key]]),
  );
  week.card = { ...week.card, ...changes };
  if (typeof notes === 'string') week.notes = notes;
  week.updatedAt = new Date().toISOString();
  state.weeks[weekNumber] = week;
  return saveState(state);
}

export function setFinalVerdict(verdict) {
  const state = loadState();
  state.finalVerdict = verdict;
  return saveState(state);
}
