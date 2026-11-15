import { describe, expect, it } from 'vitest';
import {
  EDGE,
  LAUNCH_SIZE,
  PANEL_GAP,
  clampPosition,
  panelLayout
} from './assistantPosition.js';

describe('clampPosition', () => {
  it('leaves a position inside the viewport alone', () => {
    expect(clampPosition({ x: 400, y: 300 }, 1280, 800)).toEqual({ x: 400, y: 300 });
  });

  it('pulls a bubble dragged past the right and bottom edges back inside', () => {
    const clamped = clampPosition({ x: 5000, y: 5000 }, 1280, 800);
    expect(clamped.x).toBe(1280 - LAUNCH_SIZE - EDGE);
    expect(clamped.y).toBe(800 - LAUNCH_SIZE - EDGE);
  });

  it('keeps the bubble on screen when a resize shrinks the viewport', () => {
    const clamped = clampPosition({ x: 1100, y: 700 }, 390, 640);
    expect(clamped.x).toBe(390 - LAUNCH_SIZE - EDGE);
    expect(clamped.y).toBe(640 - LAUNCH_SIZE - EDGE);
  });

  it('never pushes the bubble past the top-left edge', () => {
    expect(clampPosition({ x: -200, y: -50 }, 1280, 800)).toEqual({ x: EDGE, y: EDGE });
  });

  it('still returns an on-screen spot for a viewport smaller than the bubble', () => {
    const clamped = clampPosition({ x: 40, y: 40 }, 40, 40);
    expect(clamped).toEqual({ x: EDGE, y: EDGE });
  });
});

describe('panelLayout', () => {
  it('uses the default corner before the bubble has been moved', () => {
    expect(panelLayout(null, 1280, 800)).toBeUndefined();
  });

  it('opens above a bubble dropped near the bottom', () => {
    const style = panelLayout({ x: 1200, y: 720 }, 1280, 800);
    expect(style.top).toBe('auto');
    expect(style.bottom).toBe(`${800 - 720 + PANEL_GAP}px`);
    expect(style.maxHeight).toBe('560px');
  });

  it('opens below a bubble dropped near the top', () => {
    const style = panelLayout({ x: 200, y: 40 }, 1280, 800);
    expect(style.bottom).toBe('auto');
    expect(style.top).toBe(`${40 + LAUNCH_SIZE + PANEL_GAP}px`);
  });

  it('centres the panel on the bubble and keeps it off the right edge', () => {
    const style = panelLayout({ x: 1240, y: 300 }, 1280, 800);
    expect(style.left).toBe(`${1280 - 380 - EDGE}px`);
    expect(style.width).toBe('380px');
  });

  it('narrows the panel on a phone-width viewport', () => {
    const style = panelLayout({ x: 300, y: 500 }, 390, 720);
    expect(style.width).toBe(`${390 - EDGE * 2}px`);
    expect(style.left).toBe(`${EDGE}px`);
  });

  it('falls back to a full-column panel when neither side has room', () => {
    const style = panelLayout({ x: 200, y: 180 }, 1280, 400);
    expect(style.top).toBe(`${EDGE}px`);
    expect(style.bottom).toBe('auto');
    expect(style.maxHeight).toBe(`${400 - EDGE * 2}px`);
  });
});
