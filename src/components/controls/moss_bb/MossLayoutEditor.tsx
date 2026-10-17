import {
    Add,
    Article,
    ArrowDownward,
    ArrowUpward,
    CenterFocusStrong,
    Close,
    Create,
    CropSquare,
    DeleteOutline,
    GridOn,
    Layers,
    OpenWith,
    Redo as RedoIcon,
    Remove,
    TextFields,
    Undo as UndoIcon,
    ZoomIn,
    ZoomOut,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useEventCallback,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { chatCompletionOnce } from '../../../api/llmOneShot';
import { makeOutputUrl } from '../../../api/utils';
import { mossImageSystemPrompt } from '../../chat/prompts/mossImage';
import { useApiURL } from '../../../hooks/useApiURL';
import { useIsPhone } from '../../../hooks/useIsPhone';
import { useLLMConfig } from '../../../hooks/useLLMConfig';
import { useResult } from '../../../hooks/useResult';
import { useTranslate } from '../../../i18n/I18nContext';
import {
    MossBBox,
    MossLayoutDraft,
    MossLayoutItem,
    compileMossDraft,
    decompileMossPrompt,
    extractMossPrompt,
} from '../../../utils/mossLayout';
import { MossLayoutCanvas } from './MossLayoutCanvas';
import {
    CanvasMode,
    EditableItem,
    TextDisplay,
    ViewState,
    boxColor,
    clampView,
} from './types';

type EditorState = {
    items: EditableItem[];
    summary: string;
    width: number;
    height: number;
    meta?: string[];
    canvas?: 'single' | 'multi_panel' | 'collage';
    palette?: string[];
};

const CANVAS_MODES = ['single', 'multi_panel', 'collage'] as const;

const TEXT_DISPLAYS: TextDisplay[] = ['none', 'text', 'all'];

const PALETTE_MAX = 8;

const normalizeHex = (value: string): string => {
    const v = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) {
        return v;
    }
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
    if (short) {
        return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
    }
    return '#000000';
};

/**
 * Color chips with the native picker; add/remove per element. Values are
 * committed as `#rrggbb` strings (the compiler stores them as plain strings).
 */
const PaletteField = ({
    label,
    value,
    removeLabel,
    addLabel,
    onCommit,
}: {
    label: string;
    value?: string[];
    removeLabel: string;
    addLabel: string;
    onCommit: (next: string[] | undefined) => void;
}) => {
    const colors = value ?? [];
    const change = (index: number, hex: string): void => {
        const next = [...colors];
        next[index] = hex;
        onCommit(next);
    };
    const remove = (index: number): void => {
        const next = colors.filter((_, j) => j !== index);
        onCommit(next.length ? next : undefined);
    };
    return (
        <Box>
            <Typography variant='caption' color='text.secondary'>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mt: 0.25 }}>
                {colors.map((color, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            component='input'
                            type='color'
                            value={normalizeHex(color)}
                            title={color}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                change(i, e.target.value)
                            }
                            sx={{
                                width: 44,
                                height: 30,
                                p: 0,
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                            }}
                        />
                        <IconButton
                            size='small'
                            onClick={() => remove(i)}
                            aria-label={removeLabel}
                        >
                            <Close fontSize='small' />
                        </IconButton>
                    </Box>
                ))}
                {colors.length < PALETTE_MAX && (
                    <IconButton
                        size='small'
                        color='primary'
                        onClick={() => onCommit([...colors, '#808080'])}
                        aria-label={addLabel}
                    >
                        <Add fontSize='small' />
                    </IconButton>
                )}
            </Box>
        </Box>
    );
};

const parseList = (value: string): string[] =>
    value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

/**
 * Comma-separated string list editor; commits on blur so intermediate
 * typing (trailing commas) does not mangle the value.
 */
const ListField = ({
    label,
    placeholder,
    value,
    ownerId,
    onCommit,
}: {
    label: string;
    placeholder?: string;
    value?: string[];
    /** Identity of the field owner; forces re-sync when it changes even
     * if `value` stays `undefined` (both boxes without tags). */
    ownerId: string | number;
    onCommit: (next: string[] | undefined) => void;
}) => {
    const [text, setText] = useState(value?.join(', ') ?? '');
    // Re-sync whenever the committed value or the owning box changes
    // (box switch, undo, or our own commit - the latter also normalizes
    // trailing commas).
    useEffect(() => {
        setText(value?.join(', ') ?? '');
    }, [value, ownerId]);
    return (
        <TextField
            size='small'
            fullWidth
            label={label}
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
                const parsed = parseList(text);
                onCommit(parsed.length ? parsed : undefined);
            }}
        />
    );
};

const MIN_DIM = 64;
const MAX_DIM = 4096;
const MIN_BOX = 8;

const clampDim = (v: number): number => {
    const r = Math.round(v / 16) * 16;
    return Math.max(MIN_DIM, Math.min(MAX_DIM, r));
};

const ASPECTS: [number, number][] = [
    [1, 1],
    [16, 9],
    [9, 16],
    [4, 3],
    [3, 4],
    [3, 2],
    [2, 3],
];

/**
 * Lazily loaded (own JS chunk) bounding box / layout editor for MOSS-Image.
 * Parses the prompt into a layout draft (offering an LLM conversion for
 * plain-text prompts), lets the user draw/move/resize/delete boxes, then
 * compiles the result back into the prompt field.
 */
export const MossLayoutEditor = ({ onClose }: { onClose: () => void }) => {
    const tr = useTranslate();
    const isPhone = useIsPhone();
    const llmConfig = useLLMConfig();
    const { getValues, setValue } = useFormContext();
    const apiUrl = useApiURL();
    const results = useResult();
    // Last generated image of this tab - used as an underlay for planning edits.
    const lastResult = results?.length
        ? makeOutputUrl(apiUrl, results[results.length - 1])
        : null;

    const initial = useMemo<EditorState | null>(() => {
        const promptText = getValues('prompt');
        const width = Number(getValues('width')) || 1024;
        const height = Number(getValues('height')) || 1024;
        if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
            return { items: [], summary: '', width, height };
        }
        const parsed = decompileMossPrompt(promptText, width, height);
        if (parsed) {
            return {
                items: parsed.items.map((item, i) => ({ ...item, id: i + 1 })),
                summary: parsed.summary,
                width: parsed.width,
                height: parsed.height,
                meta: parsed.meta,
                canvas: parsed.canvas,
                palette: parsed.palette,
            };
        }
        // Non-layout prompt: the user chooses how to seed the editor.
        return null;
    }, [getValues]);

    const [ed, setEd] = useState<EditorState | null>(initial);
    const [converting, setConverting] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [mode, setMode] = useState<CanvasMode>('select');
    const [snap, setSnap] = useState(true);
    const [bg, setBg] = useState(!!lastResult);
    const [textDisplay, setTextDisplay] = useState<TextDisplay>('text');
    const [view, setView] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });
    const [history, setHistory] = useState({ undo: 0, redo: 0 });
    const [wInput, setWInput] = useState(() => String(initial?.width ?? ''));
    const [hInput, setHInput] = useState(() => String(initial?.height ?? ''));

    const edRef = useRef<EditorState | null>(initial);
    edRef.current = ed;
    const nextId = useRef((initial?.items.length ?? 0) + 1);
    const undoStack = useRef<EditableItem[][]>([]);
    const redoStack = useRef<EditableItem[][]>([]);
    const dragSnapshot = useRef<EditableItem[] | null>(null);

    const syncHistory = useEventCallback((): void => {
        setHistory({
            undo: undoStack.current.length,
            redo: redoStack.current.length,
        });
    });

    const pushUndo = useEventCallback((): void => {
        const items = edRef.current?.items ?? [];
        undoStack.current.push(items.map((it) => ({ ...it })));
        redoStack.current = [];
        syncHistory();
    });

    const undo = useEventCallback((): void => {
        const prev = undoStack.current.pop();
        if (!prev) {
            return;
        }
        redoStack.current.push((edRef.current?.items ?? []).map((it) => ({ ...it })));
        setEd((s) => (s ? { ...s, items: prev } : s));
        syncHistory();
    });

    const redo = useEventCallback((): void => {
        const next = redoStack.current.pop();
        if (!next) {
            return;
        }
        undoStack.current.push((edRef.current?.items ?? []).map((it) => ({ ...it })));
        setEd((s) => (s ? { ...s, items: next } : s));
        syncHistory();
    });

    // During a drag the first change captures the pre-gesture snapshot so the
    // whole gesture becomes a single undo step on commit.
    const handleItemsChange = useEventCallback(
        (newItems: EditableItem[]): void => {
            if (dragSnapshot.current === null) {
                dragSnapshot.current = edRef.current?.items ?? [];
            }
            setEd((s) => (s ? { ...s, items: newItems } : s));
        },
    );

    const handleCommit = useEventCallback((): void => {
        if (dragSnapshot.current) {
            undoStack.current.push(dragSnapshot.current);
            redoStack.current = [];
            dragSnapshot.current = null;
            syncHistory();
        }
    });

    const handleCreate = useEventCallback(
        (bbox: MossBBox): void => {
            pushUndo();
            const id = nextId.current++;
            setEd((s) =>
                s
                    ? {
                          ...s,
                          items: [
                              ...s.items,
                              { id, label: 'object', caption: '', bbox },
                          ],
                      }
                    : s,
            );
            setSelectedId(id);
        },
    );

    const deleteItem = useEventCallback(
        (id: number): void => {
            pushUndo();
            setEd((s) =>
                s ? { ...s, items: s.items.filter((it) => it.id !== id) } : s,
            );
            setSelectedId((sel) => (sel === id ? null : sel));
        },
    );

    const moveItem = useEventCallback(
        (index: number, dir: -1 | 1): void => {
            const items = edRef.current?.items ?? [];
            const target = index + dir;
            if (target < 0 || target >= items.length) {
                return;
            }
            pushUndo();
            setEd((s) => {
                if (!s) {
                    return s;
                }
                const next = [...s.items];
                [next[index], next[target]] = [next[target], next[index]];
                return { ...s, items: next };
            });
        },
    );

    // Text/caption edits are deliberately not pushed to the undo stack
    // (per-keystroke snapshots would make undo useless for typing).
    const patchItem = useEventCallback(
        (id: number, patch: Partial<MossLayoutItem>): void => {
            setEd((s) =>
                s
                    ? {
                          ...s,
                          items: s.items.map((it) =>
                              it.id === id ? { ...it, ...patch } : it,
                          ),
                      }
                    : s,
            );
        },
    );

    const setEdge = useEventCallback(
        (id: number, edge: number, delta: number): void => {
            const s = edRef.current;
            const item = s?.items.find((it) => it.id === id);
            if (!s || !item) {
                return;
            }
            const bbox = [...item.bbox] as MossBBox;
            const limit = edge === 0 || edge === 2 ? s.width : s.height;
            bbox[edge] = Math.max(0, Math.min(limit, bbox[edge] + delta));
            if (bbox[2] <= bbox[0] + MIN_BOX || bbox[3] <= bbox[1] + MIN_BOX) {
                return;
            }
            pushUndo();
            patchItem(id, { bbox });
        },
    );

    const nudge = useEventCallback(
        (dx: number, dy: number): void => {
            if (selectedId === null) {
                return;
            }
            const item = edRef.current?.items.find((it) => it.id === selectedId);
            if (!item) {
                return;
            }
            patchItem(selectedId, {
                bbox: [
                    item.bbox[0] + dx,
                    item.bbox[1] + dy,
                    item.bbox[2] + dx,
                    item.bbox[3] + dy,
                ] as MossBBox,
            });
        },
    );

    const applyDimensions = useEventCallback(
        (width: number, height: number): void => {
            const s = edRef.current;
            if (!s) {
                return;
            }
            const w = clampDim(width);
            const h = clampDim(height);
            setWInput(String(w));
            setHInput(String(h));
            if (w === s.width && h === s.height) {
                return;
            }
            const sx = w / s.width;
            const sy = h / s.height;
            const items = s.items.map((it) => ({
                ...it,
                bbox: [
                    Math.round((it.bbox[0] * sx) / 16) * 16,
                    Math.round((it.bbox[1] * sy) / 16) * 16,
                    Math.round((it.bbox[2] * sx) / 16) * 16,
                    Math.round((it.bbox[3] * sy) / 16) * 16,
                ] as MossBBox,
            }));
            setEd({ ...s, width: w, height: h, items });
            setView((v) => clampView(v, w, h));
        },
    );

    const readForm = useEventCallback((): { prompt: string; width: number; height: number } => {
        return {
            prompt: String(getValues('prompt') ?? ''),
            width: Number(getValues('width')) || 1024,
            height: Number(getValues('height')) || 1024,
        };
    });

    const convertWithLLM = useEventCallback(async (): Promise<void> => {
        if (!llmConfig?.model) {
            toast.error(tr('moss_bb.llm_not_configured'));
            return;
        }
        const { prompt: promptText, width, height } = readForm();
        setConverting(true);
        try {
            const completion = await chatCompletionOnce(llmConfig, [
                { role: 'system', content: mossImageSystemPrompt },
                {
                    role: 'user',
                    content:
                        `Convert the following image description into a MOSS-Image Layout draft for a ${width}x${height} canvas. ` +
                        'Output ONLY one ```json block with the draft (bbox_coord_space "abs", bbox_format "xyxy", absolute top-left pixels). ' +
                        'Preserve the subjects and every visible string exactly.\n\n' +
                        promptText,
                },
            ]);
            const res = extractMossPrompt(completion);
            let draft: MossLayoutDraft | null = null;
            if (res.kind === 'layout') {
                draft = decompileMossPrompt(res.prompt, res.width, res.height);
            } else if (res.kind === 'caption') {
                draft = { width, height, summary: res.prompt, items: [] };
            } else if (res.kind === 'raw') {
                draft = decompileMossPrompt(completion, width, height);
            }
            if (!draft) {
                toast.error(tr('moss_bb.llm_no_layout'));
                return;
            }
            setEd({
                items: draft.items.map((item, i) => ({ ...item, id: i + 1 })),
                summary: draft.summary,
                width: draft.width,
                height: draft.height,
                meta: draft.meta,
                canvas: draft.canvas,
                palette: draft.palette,
            });
        } catch (e) {
            toast.error(
                tr('moss_bb.llm_failed', {
                    err: e instanceof Error ? e.message : String(e),
                }),
            );
        } finally {
            setConverting(false);
        }
    });

    const chooseCaption = useEventCallback((): void => {
        const { prompt: promptText, width, height } = readForm();
        setEd({ items: [], summary: promptText.trim(), width, height });
    });

    const apply = useEventCallback((): void => {
        const s = edRef.current;
        if (!s) {
            onClose();
            return;
        }
        if (s.items.length === 0) {
            setValue('prompt', s.summary.trim());
            setValue('width', s.width);
            setValue('height', s.height);
            onClose();
            return;
        }
        if (!s.summary.trim()) {
            toast.error(tr('moss_bb.summary_required'));
            return;
        }
        try {
            const compiled = compileMossDraft({
                width: s.width,
                height: s.height,
                summary: s.summary.trim(),
                meta: s.meta,
                canvas: s.canvas,
                palette: s.palette,
                items: s.items.map((it) => ({
                    label: it.label,
                    caption: it.caption,
                    bbox: it.bbox,
                    ...(it.text !== undefined ? { text: it.text } : {}),
                    ...(it.tags !== undefined ? { tags: it.tags } : {}),
                    ...(it.palette !== undefined
                        ? { palette: it.palette }
                        : {}),
                })),
            });
            setValue('prompt', compiled);
            setValue('width', s.width);
            setValue('height', s.height);
            onClose();
        } catch (e) {
            toast.error(
                tr('moss_bb.invalid', {
                    err: e instanceof Error ? e.message : String(e),
                }),
            );
        }
    });

    const zoom = useEventCallback(
        (factor: number): void => {
            const s = edRef.current;
            if (!s) {
                return;
            }
            const vx = s.width / 2;
            const vy = s.height / 2;
            const scale = Math.min(10, Math.max(0.05, view.scale * factor));
            setView(
                clampView(
                    {
                        scale,
                        tx: vx - ((vx - view.tx) / view.scale) * scale,
                        ty: vy - ((vy - view.ty) / view.scale) * scale,
                    },
                    s.width,
                    s.height,
                ),
            );
        },
    );

    // When a box outside the current viewport gets selected (e.g. from the
    // list), pan it into view.
    const viewRef = useRef(view);
    viewRef.current = view;
    useEffect(() => {
        const s = edRef.current;
        if (!s || selectedId === null) {
            return;
        }
        const it = s.items.find((x) => x.id === selectedId);
        if (!it) {
            return;
        }
        const v = viewRef.current;
        const [x1, y1, x2, y2] = it.bbox;
        const vx1 = x1 * v.scale + v.tx;
        const vx2 = x2 * v.scale + v.tx;
        const vy1 = y1 * v.scale + v.ty;
        const vy2 = y2 * v.scale + v.ty;
        if (vx2 <= 0 || vx1 >= s.width || vy2 <= 0 || vy1 >= s.height) {
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            setView(
                clampView(
                    {
                        scale: v.scale,
                        tx: s.width / 2 - cx * v.scale,
                        ty: s.height / 2 - cy * v.scale,
                    },
                    s.width,
                    s.height,
                ),
            );
        }
    }, [selectedId]);

    const handleKeyDown = useEventCallback(
        (e: React.KeyboardEvent): void => {
            const t = e.target as HTMLElement;
            if (
                t.tagName === 'INPUT' ||
                t.tagName === 'TEXTAREA' ||
                t.tagName === 'SELECT' ||
                t.isContentEditable
            ) {
                return;
            }
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if (mod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
                return;
            }
            if (!edRef.current) {
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
                e.preventDefault();
                deleteItem(selectedId);
                return;
            }
            const step = e.shiftKey ? 16 : 1;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                nudge(-step, 0);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nudge(step, 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                nudge(0, -step);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                nudge(0, step);
            } else if (e.key === 'Escape') {
                setSelectedId(null);
            }
        },
    );

    const selected = ed?.items.find((it) => it.id === selectedId) ?? null;
    const nudgeStep = snap ? 16 : 1;

    return (
        <Dialog
            open
            onClose={onClose}
            fullScreen={isPhone}
            maxWidth={false}
            aria-label={tr('moss_bb.title')}
            PaperProps={{
                sx: isPhone
                    ? undefined
                    : {
                          width: 'min(1750px, 97vw)',
                          height: 'min(96vh, 1200px)',
                          display: 'flex',
                          flexDirection: 'column',
                      },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: { xs: 0.75, md: 1 },
                    flexWrap: 'wrap',
                }}
            >
                <Typography
                    variant='h6'
                    sx={{
                        flex: 1,
                        whiteSpace: 'nowrap',
                        display: { xs: 'none', md: 'block' },
                    }}
                >
                    {tr('moss_bb.title')}
                </Typography>
                {ed && (
                    <>
                        <ToggleButtonGroup
                            size='small'
                            exclusive
                            value={mode}
                            onChange={(_, v) => v && setMode(v)}
                            aria-label={tr('moss_bb.mode')}
                        >
                            <ToggleButton value='select' aria-label={tr('moss_bb.mode_select')}>
                                <OpenWith />
                            </ToggleButton>
                            <ToggleButton value='draw' aria-label={tr('moss_bb.mode_draw')}>
                                <Create />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip
                            // Functional tooltip: explains the toggle state /
                            // why the button is disabled. Force-enabled because
                            // the app theme disables "help" tooltips globally
                            // via the disable_help setting (see ThemeContext).
                            disableHoverListener={false}
                            disableTouchListener={false}
                            title={tr('moss_bb.snap')}
                        >
                            <span>
                                <IconButton
                                    size='small'
                                    color={snap ? 'primary' : 'default'}
                                    onClick={() => setSnap((s) => !s)}
                                >
                                    <GridOn />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            // Functional tooltip: explains the underlay toggle
                            // and the reason it is disabled without a result.
                            disableHoverListener={false}
                            disableTouchListener={false}
                            title={
                                lastResult
                                    ? tr('moss_bb.bg')
                                    : tr('moss_bb.bg_none')
                            }
                        >
                            <span>
                                <IconButton
                                    size='small'
                                    color={bg ? 'primary' : 'default'}
                                    disabled={!lastResult}
                                    onClick={() => setBg((b) => !b)}
                                >
                                    <Layers />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            // Functional tooltip: current in-box label mode.
                            disableHoverListener={false}
                            disableTouchListener={false}
                            title={tr(`moss_bb.text_${textDisplay}`)}
                        >
                            <span>
                                <IconButton
                                    size='small'
                                    color={textDisplay === 'none' ? 'default' : 'primary'}
                                    onClick={() =>
                                        setTextDisplay(
                                            TEXT_DISPLAYS[
                                                (TEXT_DISPLAYS.indexOf(textDisplay) + 1) %
                                                    TEXT_DISPLAYS.length
                                            ],
                                        )
                                    }
                                >
                                    {textDisplay === 'none' && <CropSquare />}
                                    {textDisplay === 'text' && <TextFields />}
                                    {textDisplay === 'all' && <Article />}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <IconButton size='small' onClick={undo} disabled={history.undo === 0}>
                            <UndoIcon />
                        </IconButton>
                        <IconButton size='small' onClick={redo} disabled={history.redo === 0}>
                            <RedoIcon />
                        </IconButton>
                        {!isPhone && (
                            <>
                                <IconButton size='small' onClick={() => zoom(1 / 1.25)}>
                                    <ZoomOut />
                                </IconButton>
                                <IconButton size='small' onClick={() => zoom(1.25)}>
                                    <ZoomIn />
                                </IconButton>
                                <IconButton size='small' onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}>
                                    <CenterFocusStrong />
                                </IconButton>
                            </>
                        )}
                    </>
                )}
            </DialogTitle>
            <DialogContent
                tabIndex={0}
                onKeyDown={handleKeyDown}
                sx={{
                    p: 0,
                    m: 0,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                }}
            >
                {ed ? (
                    <>
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                minHeight: { xs: 260, md: 0 },
                                minWidth: 0,
                            }}
                        >
                            <MossLayoutCanvas
                                width={ed.width}
                                height={ed.height}
                                items={ed.items}
                                selectedId={selectedId}
                                mode={mode}
                                snap={snap}
                                view={view}
                                bgUrl={bg ? lastResult : null}
                                textMode={textDisplay}
                                onViewChange={setView}
                                onSelect={setSelectedId}
                                onItemsChange={handleItemsChange}
                                onCommit={handleCommit}
                                onCreate={handleCreate}
                            />
                        </Box>
                        <Box
                            sx={{
                                boxSizing: 'border-box',
                                width: { xs: '100%', md: 340 },
                                height: { xs: '34%', md: 'auto' },
                                maxHeight: { md: '100%' },
                                borderLeft: { md: '1px solid' },
                                borderTop: { xs: '1px solid', md: 'none' },
                                borderColor: 'divider',
                                overflowY: 'auto',
                                p: { xs: 1, md: 2 },
                                display: 'flex',
                                flexDirection: 'column',
                                gap: { xs: 0.75, md: 2 },
                            }}
                        >
                            {/* Canvas size */}
                            <Box>
                                <Typography variant='overline'>{tr('moss_bb.canvas')}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                    <TextField
                                        size='small'
                                        type='number'
                                        label={tr('controls.width')}
                                        value={wInput}
                                        onChange={(e) => setWInput(e.target.value)}
                                        onBlur={() => applyDimensions(Number(wInput) || ed.width, ed.height)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyDimensions(Number(wInput) || ed.width, ed.height)}
                                        sx={{ width: 110 }}
                                    />
                                    <TextField
                                        size='small'
                                        type='number'
                                        label={tr('controls.height')}
                                        value={hInput}
                                        onChange={(e) => setHInput(e.target.value)}
                                        onBlur={() => applyDimensions(ed.width, Number(hInput) || ed.height)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyDimensions(ed.width, Number(hInput) || ed.height)}
                                        sx={{ width: 110 }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {ASPECTS.map(([a, b]) => (
                                        <Button
                                            key={`${a}:${b}`}
                                            size='small'
                                            variant={
                                                Math.abs(ed.width / ed.height - a / b) < 0.02 * (a / b)
                                                    ? 'contained'
                                                    : 'outlined'
                                            }
                                            onClick={() => {
                                                const long = 1024;
                                                const w = a >= b ? long : Math.round((long * a) / b / 16) * 16;
                                                const h = a >= b ? Math.round((long * b) / a / 16) * 16 : long;
                                                applyDimensions(w, h);
                                            }}
                                        >
                                            {a}:{b}
                                        </Button>
                                    ))}
                                </Box>
                            </Box>
                            <Divider />
                            {/* Summary */}
                            <Box>
                                <Typography variant='overline'>{tr('moss_bb.summary')}</Typography>
                                <TextField
                                    size='small'
                                    multiline
                                    minRows={isPhone ? 2 : 3}
                                    maxRows={6}
                                    fullWidth
                                    value={ed.summary}
                                    onChange={(e) =>
                                        setEd((s) => (s ? { ...s, summary: e.target.value } : s))
                                    }
                                />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <Select
                                        size='small'
                                        value={ed.canvas ?? 'single'}
                                        onChange={(e) =>
                                            setEd((s) =>
                                                s
                                                    ? {
                                                          ...s,
                                                          canvas: e.target
                                                              .value as (typeof CANVAS_MODES)[number],
                                                      }
                                                    : s,
                                            )
                                        }
                                        sx={{ minWidth: 150 }}
                                    >
                                        {CANVAS_MODES.map((mode) => (
                                            <MenuItem key={mode} value={mode}>
                                                {tr(`moss_bb.canvas_${mode}`)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <ListField
                                        key='meta'
                                        label={tr('moss_bb.summary_meta')}
                                        value={ed.meta}
                                        ownerId='meta'
                                        onCommit={(meta) =>
                                            setEd((s) => (s ? { ...s, meta } : s))
                                        }
                                    />
                                </Box>
                                <PaletteField
                                    label={tr('moss_bb.summary_palette')}
                                    value={ed.palette}
                                    removeLabel={tr('moss_bb.palette_remove')}
                                    addLabel={tr('moss_bb.palette_add')}
                                    onCommit={(palette) =>
                                        setEd((s) => (s ? { ...s, palette } : s))
                                    }
                                />
                            </Box>
                            <Divider />
                            {/* Boxes list */}
                            <Box>
                                <Typography variant='overline'>{tr('moss_bb.boxes')}</Typography>
                                {ed.items.length === 0 && (
                                    <Typography variant='body2' color='text.secondary'>
                                        {tr('moss_bb.new_box_hint')}
                                    </Typography>
                                )}
                                {ed.items.map((item, i) => (
                                    <Box
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            p: { xs: 0.5, md: 0.75 },
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            bgcolor:
                                                item.id === selectedId
                                                    ? 'action.selected'
                                                    : 'transparent',
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 1,
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: boxColor(i),
                                                color: '#fff',
                                                fontSize: 12,
                                            }}
                                        >
                                            {i + 1}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant='body2' noWrap>
                                                {item.text?.trim() ||
                                                    item.caption.trim() ||
                                                    tr('moss_bb.untitled')}
                                            </Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                                {tr(`moss_bb.type_${item.label}`)}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size='small'
                                            aria-label={tr('moss_bb.move_up')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveItem(i, -1);
                                            }}
                                        >
                                            <ArrowUpward fontSize='small' />
                                        </IconButton>
                                        <IconButton
                                            size='small'
                                            aria-label={tr('moss_bb.move_down')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveItem(i, 1);
                                            }}
                                        >
                                            <ArrowDownward fontSize='small' />
                                        </IconButton>
                                        <IconButton
                                            size='small'
                                            color='error'
                                            aria-label={tr('moss_bb.delete')}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteItem(item.id);
                                            }}
                                        >
                                            <DeleteOutline fontSize='small' />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                            {/* Selected item properties */}
                            {selected && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Divider />
                                    <Typography variant='overline'>
                                        {tr('moss_bb.box_properties')}
                                    </Typography>
                                    <ToggleButtonGroup
                                        size='small'
                                        exclusive
                                        value={selected.label}
                                        onChange={(_, v) => {
                                            if (v) {
                                                pushUndo();
                                                patchItem(selected.id, { label: v });
                                            }
                                        }}
                                        fullWidth
                                    >
                                        <ToggleButton value='object'>
                                            {tr('moss_bb.type_object')}
                                        </ToggleButton>
                                        <ToggleButton value='character'>
                                            {tr('moss_bb.type_character')}
                                        </ToggleButton>
                                        <ToggleButton value='text'>
                                            {tr('moss_bb.type_text')}
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                    {selected.label === 'text' && (
                                        <TextField
                                            size='small'
                                            fullWidth
                                            multiline
                                            minRows={1}
                                            label={tr('moss_bb.visible_text')}
                                            value={selected.text ?? ''}
                                            onChange={(e) =>
                                                patchItem(selected.id, { text: e.target.value })
                                            }
                                        />
                                    )}
                                    <TextField
                                        size='small'
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        label={tr('moss_bb.description')}
                                        value={selected.caption}
                                        onChange={(e) =>
                                            patchItem(selected.id, { caption: e.target.value })
                                        }
                                    />
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                        {(['left', 'top', 'right', 'bottom'] as const).map(
                                            (side, idx) => (
                                                <Box
                                                    key={side}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                                >
                                                    <IconButton
                                                        size='small'
                                                        onClick={() => setEdge(selected.id, idx, -nudgeStep)}
                                                    >
                                                        <Remove fontSize='small' />
                                                    </IconButton>
                                                    <Typography
                                                        variant='body2'
                                                        sx={{ flex: 1, textAlign: 'center' }}
                                                    >
                                                        {tr(`moss_bb.pos_${side}`)}{' '}
                                                        {Math.round(selected.bbox[idx])}
                                                    </Typography>
                                                    <IconButton
                                                        size='small'
                                                        onClick={() => setEdge(selected.id, idx, nudgeStep)}
                                                    >
                                                        <Add fontSize='small' />
                                                    </IconButton>
                                                </Box>
                                            ),
                                        )}
                                    </Box>
                                    <ListField
                                        key={`tags-${selected.id}`}
                                        label={tr('moss_bb.box_tags')}
                                        value={selected.tags}
                                        ownerId={selected.id}
                                        onCommit={(tags) =>
                                            patchItem(selected.id, { tags })
                                        }
                                    />
                                    <PaletteField
                                        label={tr('moss_bb.box_palette')}
                                        value={selected.palette}
                                        removeLabel={tr('moss_bb.palette_remove')}
                                        addLabel={tr('moss_bb.palette_add')}
                                        onCommit={(palette) =>
                                            patchItem(selected.id, { palette })
                                        }
                                    />
                                    <Button
                                        size='small'
                                        color='error'
                                        startIcon={<DeleteOutline />}
                                        onClick={() => deleteItem(selected.id)}
                                    >
                                        {tr('moss_bb.delete')}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </>
                ) : (
                    <Box sx={{ p: 3, maxWidth: 520, mx: 'auto' }}>
                        <Typography sx={{ mb: 2 }}>{tr('moss_bb.choose_content')}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button variant='contained' onClick={chooseCaption} disabled={converting}>
                                {tr('moss_bb.choose_caption')}
                            </Button>
                            {!!llmConfig?.model && (
                                <Button variant='outlined' onClick={convertWithLLM} disabled={converting}>
                                    {converting ? (
                                        <CircularProgress size={18} />
                                    ) : (
                                        tr('moss_bb.choose_llm')
                                    )}
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 2, py: { xs: 0.75, md: 1.5 } }}>
                <Button onClick={onClose}>{tr('controls.cancel')}</Button>
                <Button variant='contained' onClick={apply}>
                    {tr('moss_bb.apply')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
