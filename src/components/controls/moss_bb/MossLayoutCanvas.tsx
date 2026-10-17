import { Box, useEventCallback } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { MossBBox } from '../../../utils/mossLayout';
import {
    CanvasMode,
    EditableItem,
    TextDisplay,
    ViewState,
    boxColor,
    clampView,
} from './types';

const HANDLE_EDGES = [
    { cx: 'x1', cy: 'y1' }, // tl
    { cx: 'mx', cy: 'y1' }, // t
    { cx: 'x2', cy: 'y1' }, // tr
    { cx: 'x2', cy: 'my' }, // r
    { cx: 'x2', cy: 'y2' }, // br
    { cx: 'mx', cy: 'y2' }, // b
    { cx: 'x1', cy: 'y2' }, // bl
    { cx: 'x1', cy: 'my' }, // l
] as const;

const HANDLE_CURSORS = [
    'nwse-resize', // tl
    'ns-resize', // t
    'nesw-resize', // tr
    'ew-resize', // r
    'nwse-resize', // br
    'ns-resize', // b
    'nesw-resize', // bl
    'ew-resize', // l
] as const;

const MIN_SIZE = 8;

/**
 * Greedy word wrap by estimated character capacity at the given font size.
 */
const wrapLines = (text: string, fs: number, maxWidth: number): string[] => {
    const maxChars = Math.max(1, Math.floor(maxWidth / (fs * 0.58)));
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (line && test.length > maxChars) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
};

type Gesture =
    | { kind: 'draw'; start: { x: number; y: number }; current: { x: number; y: number } }
    | { kind: 'move'; id: number; startBox: MossBBox; startP: { x: number; y: number } }
    | {
          kind: 'resize';
          id: number;
          handle: number;
          startBox: MossBBox;
      }
    | { kind: 'pan'; startClient: { x: number; y: number }; startView: ViewState }
    | {
          kind: 'pinch';
          startDist: number;
          startMid: { x: number; y: number };
          startView: ViewState;
          anchor: { x: number; y: number };
      };

export const MossLayoutCanvas = ({
    width,
    height,
    items,
    selectedId,
    mode,
    snap,
    view,
    bgUrl,
    textMode,
    onViewChange,
    onSelect,
    onItemsChange,
    onCommit,
    onCreate,
}: {
    width: number;
    height: number;
    items: EditableItem[];
    selectedId: number | null;
    mode: CanvasMode;
    snap: boolean;
    view: ViewState;
    bgUrl: string | null;
    textMode: TextDisplay;
    onViewChange: (view: ViewState) => void;
    onSelect: (id: number | null) => void;
    onItemsChange: (items: EditableItem[]) => void;
    onCommit: () => void;
    onCreate: (bbox: MossBBox) => void;
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [area, setArea] = useState({ w: 0, h: 0 });
    const [tempRect, setTempRect] = useState<MossBBox | null>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<Gesture | null>(null);

    // Track the container box; the SVG fills it entirely while the canvas
    // viewBox stays centered (meet).
    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return;
        }
        const measure = () => {
            setArea({ w: el.clientWidth, h: el.clientHeight });
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // CSS px per viewBox unit under the SVG's centered meet fit.
    const meetScale = (r: DOMRect): number =>
        Math.max(
            1e-9,
            Math.min(r.width / width, r.height / height),
        );

    const viewBox = (clientX: number, clientY: number) => {
        const r = svgRef.current?.getBoundingClientRect();
        if (!r || r.width === 0) {
            return { x: 0, y: 0 };
        }
        const s = meetScale(r);
        return {
            x: (clientX - r.left - (r.width - width * s) / 2) / s,
            y: (clientY - r.top - (r.height - height * s) / 2) / s,
        };
    };

    const toCanvas = (clientX: number, clientY: number) => {
        const v = viewBox(clientX, clientY);
        return {
            x: (v.x - view.tx) / view.scale,
            y: (v.y - view.ty) / view.scale,
        };
    };

    const snapValue = useEventCallback(
        (v: number): number => {
            const clamped = Math.max(0, Math.min(v, 100000));
            return snap ? Math.round(clamped / 16) * 16 : Math.round(clamped);
        },
    );

    const clampBox = useEventCallback(
        (box: MossBBox, movingEdge: 'x1' | 'y1' | 'x2' | 'y2' | null): MossBBox => {
            let [x1, y1, x2, y2] = box;
            x1 = Math.max(0, Math.min(x1, width));
            x2 = Math.max(0, Math.min(x2, width));
            y1 = Math.max(0, Math.min(y1, height));
            y2 = Math.max(0, Math.min(y2, height));
            if (movingEdge === 'x1') {
                x1 = Math.min(x1, x2 - MIN_SIZE);
            } else if (movingEdge === 'x2') {
                x2 = Math.max(x2, x1 + MIN_SIZE);
            } else if (movingEdge === 'y1') {
                y1 = Math.min(y1, y2 - MIN_SIZE);
            } else if (movingEdge === 'y2') {
                y2 = Math.max(y2, y1 + MIN_SIZE);
            }
            return [x1, y1, x2, y2];
        },
    );

    // Wheel zoom needs a non-passive listener to prevent page scrolling.
    // Latest-ref pattern: the listener is attached once and reads current
    // values through refs.
    const latest = useRef({ view, width, height, onViewChange });
    latest.current = { view, width, height, onViewChange };
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const { view: v, width: w, height: h, onViewChange: apply } =
                latest.current;
            const r = svg.getBoundingClientRect();
            if (r.width === 0) {
                return;
            }
            const m = Math.max(1e-9, Math.min(r.width / w, r.height / h));
            const vx = (e.clientX - r.left - (r.width - w * m) / 2) / m;
            const vy = (e.clientY - r.top - (r.height - h * m) / 2) / m;
            // Wheel zooms at the cursor; middle button drags to pan.
            const scale = Math.min(
                10,
                Math.max(0.05, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
            );
            const cx = (vx - v.tx) / v.scale;
            const cy = (vy - v.ty) / v.scale;
            apply(
                clampView(
                    { scale, tx: vx - cx * scale, ty: vy - cy * scale },
                    w,
                    h,
                ),
            );
        };
        svg.addEventListener('wheel', onWheel, { passive: false });
        return () => svg.removeEventListener('wheel', onWheel);
    }, []);

    const updatePinch = useEventCallback((): void => {
        const g = gesture.current;
        if (g?.kind !== 'pinch' || pointers.current.size < 2) {
            return;
        }
        const [p1, p2] = [...pointers.current.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const mid = viewBox(midClient.x, midClient.y);
        const scale = Math.min(
            10,
            Math.max(0.05, (g.startView.scale * dist) / (g.startDist || 1)),
        );
        onViewChange(
            clampView(
                {
                    scale,
                    tx: mid.x - g.anchor.x * scale,
                    ty: mid.y - g.anchor.y * scale,
                },
                width,
                height,
            ),
        );
    });

    // Nested boxes: hit-testing by point picks the *smallest* box under the
    // cursor, so inner boxes win over the big outer one.
    const hitTest = useEventCallback(
        (p: { x: number; y: number }): EditableItem | null => {
            let best: EditableItem | null = null;
            let bestArea = Infinity;
            for (const it of items) {
                const [x1, y1, x2, y2] = it.bbox;
                if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                    const area = (x2 - x1) * (y2 - y1);
                    if (area < bestArea) {
                        bestArea = area;
                        best = it;
                    }
                }
            }
            return best;
        },
    );

    const handlePointerDown = useEventCallback(
        (e: React.PointerEvent<SVGSVGElement>): void => {
            // Commit any focused editor field BEFORE selection changes:
            // React flushes this pointerdown (and re-renders) before the
            // browser dispatches blur, so the field's onBlur closure would
            // otherwise target the newly selected box.
            const ae = document.activeElement;
            if (ae instanceof HTMLElement && ae.matches('input, textarea, select')) {
                ae.blur();
            }
            (e.target as Element).hasPointerCapture?.(e.pointerId);
            svgRef.current?.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pointers.current.size === 2) {
                // Second finger: switch to pinch, cancel whatever was in flight.
                const [p1, p2] = [...pointers.current.values()];
                const mid = viewBox((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                const scale = view.scale;
                gesture.current = {
                    kind: 'pinch',
                    startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
                    startMid: mid,
                    startView: { ...view },
                    anchor: { x: (mid.x - view.tx) / scale, y: (mid.y - view.ty) / scale },
                };
                setTempRect(null);
                return;
            }

            if (e.button === 1) {
                // Middle button (wheel press) always pans, over anything else.
                e.preventDefault();
                gesture.current = {
                    kind: 'pan',
                    startClient: { x: e.clientX, y: e.clientY },
                    startView: { ...view },
                };
                return;
            }

            const target = e.target as Element;
            const handle = target.closest('[data-handle]');
            const p = toCanvas(e.clientX, e.clientY);

            if (handle && selectedId !== null) {
                const item = items.find((it) => it.id === selectedId);
                if (item) {
                    gesture.current = {
                        kind: 'resize',
                        id: item.id,
                        handle: Number(handle.getAttribute('data-handle')),
                        startBox: [...item.bbox] as MossBBox,
                    };
                    return;
                }
            }
            if (mode === 'draw') {
                const s = { x: snapValue(p.x), y: snapValue(p.y) };
                gesture.current = { kind: 'draw', start: s, current: s };
                setTempRect([s.x, s.y, s.x, s.y]);
                return;
            }
            const hit = hitTest(p);
            if (hit) {
                onSelect(hit.id);
                gesture.current = {
                    kind: 'move',
                    id: hit.id,
                    startBox: [...hit.bbox] as MossBBox,
                    startP: p,
                };
                return;
            }
            gesture.current = {
                kind: 'pan',
                startClient: { x: e.clientX, y: e.clientY },
                startView: { ...view },
            };
            onSelect(null);
        },
    );

    const handlePointerMove = useEventCallback(
        (e: React.PointerEvent<SVGSVGElement>): void => {
            if (!pointers.current.has(e.pointerId)) {
                return;
            }
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const g = gesture.current;
            if (!g) {
                return;
            }
            if (g.kind === 'pinch') {
                updatePinch();
                return;
            }
            if (g.kind === 'pan') {
                const r = svgRef.current?.getBoundingClientRect();
                if (!r) {
                    return;
                }
                const k = 1 / meetScale(r);
                onViewChange(
                    clampView(
                        {
                            scale: g.startView.scale,
                            tx:
                                g.startView.tx +
                                (e.clientX - g.startClient.x) * k,
                            ty:
                                g.startView.ty +
                                (e.clientY - g.startClient.y) * k,
                        },
                        width,
                        height,
                    ),
                );
                return;
            }
            const p = toCanvas(e.clientX, e.clientY);
            if (g.kind === 'draw') {
                const c = { x: snapValue(p.x), y: snapValue(p.y) };
                g.current = c;
                setTempRect([
                    Math.min(g.start.x, c.x),
                    Math.min(g.start.y, c.y),
                    Math.max(g.start.x, c.x),
                    Math.max(g.start.y, c.y),
                ]);
                return;
            }
            const item = items.find((it) => it.id === g.id);
            if (!item) {
                return;
            }
            let box: MossBBox;
            let edge: 'x1' | 'y1' | 'x2' | 'y2' | null = null;
            if (g.kind === 'move') {
                const dx = p.x - g.startP.x;
                const dy = p.y - g.startP.y;
                const [x1, y1, x2, y2] = g.startBox;
                const w = x2 - x1;
                const h = y2 - y1;
                let nx1 = snapValue(x1 + dx);
                let ny1 = snapValue(y1 + dy);
                nx1 = Math.max(0, Math.min(nx1, width - w));
                ny1 = Math.max(0, Math.min(ny1, height - h));
                box = [nx1, ny1, nx1 + w, ny1 + h];
            } else {
                const [x1, y1, x2, y2] = g.startBox;
                box = [x1, y1, x2, y2];
                const def = HANDLE_EDGES[g.handle];
                const sx = snapValue(p.x);
                const sy = snapValue(p.y);
                // Edge (non-corner) handles move only the one edge they grab;
                // the 'mx'/'my' axes stay untouched for side handles.
                if (def.cx === 'x1') {
                    box[0] = sx;
                    edge = 'x1';
                } else if (def.cx === 'x2') {
                    box[2] = sx;
                    edge = 'x2';
                }
                if (def.cy === 'y1') {
                    box[1] = sy;
                    edge = edge ?? 'y1';
                } else if (def.cy === 'y2') {
                    box[3] = sy;
                    edge = edge ?? 'y2';
                }
            }
            box = clampBox(box, edge);
            onItemsChange(
                items.map((it) => (it.id === g.id ? { ...it, bbox: box } : it)),
            );
        },
    );

    const endGesture = useEventCallback(
        (e: React.PointerEvent<SVGSVGElement>): void => {
            pointers.current.delete(e.pointerId);
            const g = gesture.current;
            gesture.current = null;
            if (!g) {
                return;
            }
            if (g.kind === 'draw') {
                const rect = tempRect;
                setTempRect(null);
                if (
                    rect &&
                    rect[2] - rect[0] >= MIN_SIZE &&
                    rect[3] - rect[1] >= MIN_SIZE
                ) {
                    onCreate(rect);
                }
                return;
            }
            if (g.kind === 'move' || g.kind === 'resize') {
                onCommit();
            }
        },
    );

    // The browser fits the viewBox into the display box; combined with the
    // zoom transform this is the total canvas->screen factor. Countering it
    // keeps strokes, tags and handles at a fixed SCREEN px size.
    const fit =
        area.w > 0 ? Math.max(1e-9, Math.min(area.w / width, area.h / height)) : 1;
    const screenScale = fit * view.scale;
    const inv = 1 / screenScale;
    const minFont = 13 / screenScale;
    const gridStep = 64;
    const vLines: number[] = [];
    for (let x = gridStep; x < width; x += gridStep) {
        vLines.push(x);
    }
    const hLines: number[] = [];
    for (let y = gridStep; y < height; y += gridStep) {
        hLines.push(y);
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
                position: 'relative',
            }}
        >
            <svg
                ref={svgRef}
                width='100%'
                height='100%'
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio='xMidYMid meet'
                style={{
                    touchAction: 'none',
                    background: 'rgba(128,128,128,0.12)',
                    cursor: mode === 'draw' ? 'crosshair' : 'default',
                    display: 'block',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
            >
                <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
                    <rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill='rgba(128,128,128,0.25)'
                        stroke='rgba(150,150,150,0.8)'
                        strokeWidth={inv}
                    />
                    {bgUrl && (
                        <image
                            href={bgUrl}
                            x={0}
                            y={0}
                            width={width}
                            height={height}
                            preserveAspectRatio='none'
                            style={{ pointerEvents: 'none' }}
                        />
                    )}
                    {snap && (
                        <g opacity={0.15}>
                            {vLines.map((x) => (
                                <line
                                    key={`v${x}`}
                                    x1={x}
                                    y1={0}
                                    x2={x}
                                    y2={height}
                                    stroke='#fff'
                                    strokeWidth={inv}
                                />
                            ))}
                            {hLines.map((y) => (
                                <line
                                    key={`h${y}`}
                                    x1={0}
                                    y1={y}
                                    x2={width}
                                    y2={y}
                                    stroke='#fff'
                                    strokeWidth={inv}
                                />
                            ))}
                        </g>
                    )}
                    {items.map((item, i) => {
                        const [x1, y1, x2, y2] = item.bbox;
                        const color = boxColor(i);
                        const selected = item.id === selectedId;
                        const bw = x2 - x1;
                        const bh = y2 - y1;
                        // Label content depends on the display mode: nothing,
                        // only the exact text of `text` items, or text plus
                        // every caption (quoted text first, like core preview).
                        const parts: string[] = [];
                        if (
                            item.text?.trim() &&
                            (textMode === 'all' || item.label === 'text')
                        ) {
                            parts.push(`"${item.text.trim().split('\n')[0]}"`);
                        }
                        if (textMode === 'all' && item.caption.trim()) {
                            parts.push(item.caption.trim());
                        }
                        const body = parts.join(' — ');
                        const bodyFs = Math.max(
                            minFont,
                            Math.min(44, bh * 0.28, bw * 0.18),
                        );
                        const bodyLines =
                            body && bw > 16 && bh > 10
                                ? wrapLines(body, bodyFs, bw - 6)
                                : [];
                        const lineHeight = bodyFs * 1.2;
                        return (
                            <g key={item.id}>
                                <defs>
                                    <clipPath id={`moss-bb-clip-${item.id}`}>
                                        <rect x={x1} y={y1} width={bw} height={bh} />
                                    </clipPath>
                                </defs>
                                <rect
                                    data-item-id={item.id}
                                    x={x1}
                                    y={y1}
                                    width={bw}
                                    height={bh}
                                    fill='transparent'
                                    stroke={color}
                                    strokeWidth={(selected ? 3 : 2) * inv}
                                    style={{ cursor: 'move' }}
                                />
                                {bodyLines.length > 0 && (
                                    <g clipPath={`url(#moss-bb-clip-${item.id})`}>
                                        {bodyLines.map((line, li) => (
                                            <text
                                                key={li}
                                                x={x1 + 3}
                                                y={y1 + 16 * inv + 2 + bodyFs * 0.85 + li * lineHeight}
                                                fill={color}
                                                fontSize={bodyFs}
                                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                                            >
                                                {line}
                                            </text>
                                        ))}
                                    </g>
                                )}
                                <g
                                    transform={`translate(${x1} ${y1}) scale(${inv})`}
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <rect
                                        x={0}
                                        y={0}
                                        width={item.label === 'text' ? 34 : 28}
                                        height={16}
                                        fill={color}
                                    />
                                    <text x={3.5} y={12} fontSize={11} fill='#fff'>
                                        {String(i + 1).padStart(2, '0')}
                                        {item.label === 'text' ? ' T' : ''}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                    {tempRect && (
                        <rect
                            x={tempRect[0]}
                            y={tempRect[1]}
                            width={Math.max(0, tempRect[2] - tempRect[0])}
                            height={Math.max(0, tempRect[3] - tempRect[1])}
                            fill='rgba(59,130,246,0.2)'
                            stroke='#3b82f6'
                            strokeWidth={2 * inv}
                            strokeDasharray={`${4 * inv} ${3 * inv}`}
                        />
                    )}
                    {selectedId !== null &&
                        (() => {
                            const item = items.find((it) => it.id === selectedId);
                            if (!item) {
                                return null;
                            }
                            const [x1, y1, x2, y2] = item.bbox;
                            const mx = (x1 + x2) / 2;
                            const my = (y1 + y2) / 2;
                            const coords = HANDLE_EDGES.map((h) => ({
                                x: h.cx === 'x1' ? x1 : h.cx === 'x2' ? x2 : mx,
                                y: h.cy === 'y1' ? y1 : h.cy === 'y2' ? y2 : my,
                            }));
                            return (
                                <g>
                                    {coords.map((c, idx) => (
                                        <g
                                            key={idx}
                                            data-handle={idx}
                                            style={{ cursor: HANDLE_CURSORS[idx] }}
                                        >
                                            <rect
                                                x={c.x - 11 * inv}
                                                y={c.y - 11 * inv}
                                                width={22 * inv}
                                                height={22 * inv}
                                                fill='transparent'
                                            />
                                            <rect
                                                x={c.x - 5 * inv}
                                                y={c.y - 5 * inv}
                                                width={10 * inv}
                                                height={10 * inv}
                                                fill='#fff'
                                                stroke={boxColor(items.findIndex((it) => it.id === selectedId))}
                                                strokeWidth={1.5 * inv}
                                            />
                                        </g>
                                    ))}
                                </g>
                            );
                        })()}
                </g>
            </svg>
        </Box>
    );
};
