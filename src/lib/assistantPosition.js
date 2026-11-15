/**
 * Geometry for the draggable assistant launcher.
 *
 * Kept free of React and Firebase so the drag maths can be unit tested, and so
 * the panel and bubble always agree on the same constants.
 */

export const POSITION_KEY = 'haulway_assistant_position';
export const LAUNCH_SIZE = 56;
export const PANEL_GAP = 12;
export const EDGE = 12;
export const DRAG_THRESHOLD = 4;
export const PANEL_WIDTH = 380;
export const PANEL_MAX_HEIGHT = 560;
const PANEL_MIN_HEIGHT = 200;

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Some browsers throw on access in private mode.
    return null;
  }
}

export function readStoredPosition() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function savePosition(position) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    /* ignore private-mode storage errors */
  }
}

/** Keep the launcher fully on screen, including after a resize or rotation. */
export function clampPosition(position, width, height) {
  const maxX = Math.max(EDGE, width - LAUNCH_SIZE - EDGE);
  const maxY = Math.max(EDGE, height - LAUNCH_SIZE - EDGE);
  return {
    x: Math.min(Math.max(EDGE, position.x), maxX),
    y: Math.min(Math.max(EDGE, position.y), maxY)
  };
}

/**
 * The panel opens on whichever side of the launcher has more room and stays
 * centred on it, so a bubble dragged to the top-left still behaves. When
 * neither side can hold a usable panel (short viewport, bubble mid-screen) it
 * falls back to a full-height panel pinned to the top edge.
 */
export function panelLayout(position, width, height) {
  if (!position) return undefined;

  const panelWidth = Math.min(PANEL_WIDTH, width - EDGE * 2);
  const maxLeft = Math.max(EDGE, width - panelWidth - EDGE);
  const centred = position.x + LAUNCH_SIZE / 2 - panelWidth / 2;
  const left = Math.min(Math.max(EDGE, centred), maxLeft);

  const spaceAbove = position.y - PANEL_GAP - EDGE;
  const spaceBelow = height - (position.y + LAUNCH_SIZE) - PANEL_GAP - EDGE;
  const openAbove = spaceAbove >= spaceBelow;
  const available = Math.max(0, openAbove ? spaceAbove : spaceBelow);
  const panelHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(PANEL_MIN_HEIGHT, available));

  const style = {
    left: `${left}px`,
    right: 'auto',
    width: `${panelWidth}px`,
    maxHeight: `${panelHeight}px`
  };

  if (available >= PANEL_MIN_HEIGHT) {
    if (openAbove) {
      style.bottom = `${height - position.y + PANEL_GAP}px`;
      style.top = 'auto';
    } else {
      style.top = `${position.y + LAUNCH_SIZE + PANEL_GAP}px`;
      style.bottom = 'auto';
    }
    return style;
  }

  // Not enough room beside the bubble: use the full column and let the panel
  // cover the launcher rather than overflow off screen.
  style.top = `${EDGE}px`;
  style.bottom = 'auto';
  style.maxHeight = `${Math.max(PANEL_MIN_HEIGHT, height - EDGE * 2)}px`;
  return style;
}
