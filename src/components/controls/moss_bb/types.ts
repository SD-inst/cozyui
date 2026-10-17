import { MossLayoutItem } from '../../../utils/mossLayout';

export type EditableItem = MossLayoutItem & { id: number };
export type CanvasMode = 'select' | 'draw';
export type ViewState = { scale: number; tx: number; ty: number };
/** Box label rendering: none, visible text of `text` items, or everything. */
export type TextDisplay = 'none' | 'text' | 'all';

export const BOX_COLORS = [
    '#e5484d',
    '#f2a33c',
    '#46a758',
    '#3b82f6',
    '#8e4ec6',
    '#0db0c4',
    '#d6409f',
    '#c2a633',
];

export const boxColor = (index: number): string =>
    BOX_COLORS[index % BOX_COLORS.length];

/**
 * Keep panning bounded so the canvas can never be dragged entirely out of
 * the viewport (at least 25% of the visible extent always overlaps).
 */
export const clampView = (v: ViewState, width: number, height: number): ViewState => {
    const s = v.scale;
    const limit = (extent: number) => {
        const m = Math.min(extent, extent * s);
        return [0.25 * m - extent * s, extent - 0.25 * m] as const;
    };
    const [minX, maxX] = limit(width);
    const [minY, maxY] = limit(height);
    return {
        scale: s,
        tx: Math.min(maxX, Math.max(minX, v.tx)),
        ty: Math.min(maxY, Math.max(minY, v.ty)),
    };
};
