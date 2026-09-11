import {
    ChevronLeft,
    ChevronRight,
    ContentCut,
    FirstPage,
    LastPage,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import toast from 'react-hot-toast';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useApiURL } from '../../hooks/useApiURL';
import { saveUploadBackup } from '../../hooks/useBackupUpload';
import { useTranslate } from '../../i18n/I18nContext';
import { useTabName } from '../contexts/TabContext';
import { ASPECT_LABELS, aspectRatio, closestAspect } from '../../utils/aspect';
import {
    clampCrop,
    computeCanvas,
    Crop,
    defaultCrop,
    effectiveTokenCount,
    snap32,
    ImageSize,
} from '../../utils/refmodCrop';

type CropImage = { index: number; filename: string };

type SourceState = {
    url: string;
    blob: Blob | null;
    imgEl: HTMLImageElement | null;
    size: ImageSize | null;
    loading: boolean;
    error: boolean;
};

// Fetch a reference image from ComfyUI's input dir; exposes its object URL,
// the raw <img> element (for canvas cropping) and the natural size.
const useImageSource = (filename?: string): SourceState => {
    const apiUrl = useApiURL();
    const [state, setState] = useState<SourceState>({
        url: '',
        blob: null,
        imgEl: null,
        size: null,
        loading: false,
        error: false,
    });

    useEffect(() => {
        let cancelled = false;
        let objUrl = '';
        setState({
            url: '',
            blob: null,
            imgEl: null,
            size: null,
            loading: !!filename,
            error: false,
        });
        if (!filename || !apiUrl) {
            return () => {
                cancelled = true;
            };
        }
        (async () => {
            try {
                const resp = await fetch(
                    apiUrl +
                        '/api/view?subfolder=&type=input&filename=' +
                        encodeURIComponent(filename),
                );
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                if (cancelled) return;
                objUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.src = objUrl;
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
                if (cancelled) return;
                setState({
                    url: objUrl,
                    blob,
                    imgEl: img,
                    size: { width: img.naturalWidth, height: img.naturalHeight },
                    loading: false,
                    error: !img.naturalWidth,
                });
            } catch {
                if (!cancelled) {
                    setState({
                        url: '',
                        blob: null,
                        imgEl: null,
                        size: null,
                        loading: false,
                        error: true,
                    });
                }
            }
        })();
        return () => {
            cancelled = true;
            if (objUrl) URL.revokeObjectURL(objUrl);
        };
    }, [filename, apiUrl]);

    return state;
};

// The crop viewport: the image is transformed so the crop region fills the
// container. Drag (one pointer) pans; wheel / pinch (two pointers) zoom. The
// crop always keeps the selected aspect — zoom only changes how much of the
// image the region covers, not the final output (that is a pure crop).
const CropView = ({
    url,
    size,
    aspect,
    crop,
    onCropChange,
}: {
    url: string;
    size: ImageSize;
    aspect: number;
    crop: Crop;
    onCropChange: (c: Crop) => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [boxW, setBoxW] = useState(0);
    const gesture = useRef<{
        pointers: Map<number, { x: number; y: number }>;
        start: { x: number; y: number; crop: Crop; dist: number } | null;
        mode: 'pan' | 'pinch' | null;
    }>({ pointers: new Map(), start: null, mode: null });

    // Latest values for the (once-attached) wheel listener.
    const latest = useRef({ crop, aspect, size, onCropChange });
    latest.current = { crop, aspect, size, onCropChange };

    // Measure the container width (drives the display scale).
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setBoxW(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Native, non-passive wheel listener for zoom (React's onWheel can't
    // reliably preventDefault).
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            const { crop: c, aspect: a, size: sz, onCropChange: f } = latest.current;
            const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
            const newH = c.h * factor;
            const cx = c.x + c.w / 2;
            const cy = c.y + c.h / 2;
            const ratio = newH / c.h;
            const newW = c.w * ratio;
            f(clampCrop(cx - newW / 2, cy - newH / 2, newH, a, sz));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    const s = boxW / crop.w || 0;

    const onPointerDown = (e: ReactPointerEvent) => {
        const el = containerRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);
        const g = gesture.current;
        g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...g.pointers.values()];
        if (pts.length === 1) {
            g.mode = 'pan';
            g.start = { x: e.clientX, y: e.clientY, crop, dist: 0 };
        } else if (pts.length === 2) {
            const [a, b] = pts;
            g.mode = 'pinch';
            g.start = {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                crop,
                dist: Math.hypot(b.x - a.x, b.y - a.y),
            };
        }
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        const g = gesture.current;
        if (!g.pointers.has(e.pointerId) || !g.start || !g.mode) return;
        g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...g.pointers.values()];
        const start = g.start;
        if (g.mode === 'pan' && pts.length === 1) {
            const dx = (e.clientX - start.x) / s;
            const dy = (e.clientY - start.y) / s;
            onCropChange(
                clampCrop(
                    start.crop.x - dx,
                    start.crop.y - dy,
                    start.crop.h,
                    aspect,
                    size,
                ),
            );
        } else if (g.mode === 'pinch' && pts.length === 2) {
            const [a, b] = pts;
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            const ratio = start.dist ? dist / start.dist : 1;
            // The crop region is the output: a SMALLER region is a zoom-IN
            // (the image reads larger). So spreading the fingers apart
            // (ratio > 1) must shrink the region and pinching together grow it
            // — scale by the inverse of the distance ratio.
            const scale = 1 / ratio;
            const newH = start.crop.h * scale;
            // keep the crop's image-center fixed while scaling
            const cx = start.crop.x + start.crop.w / 2;
            const cy = start.crop.y + start.crop.h / 2;
            const newW = start.crop.w * scale;
            onCropChange(
                clampCrop(cx - newW / 2, cy - newH / 2, newH, aspect, size),
            );
        }
    };

    const onPointerUp = (e: ReactPointerEvent) => {
        const g = gesture.current;
        g.pointers.delete(e.pointerId);
        if (g.pointers.size === 0) {
            g.mode = null;
            g.start = null;
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                touchAction: 'none',
                cursor: 'grab',
                borderRadius: 4,
                backgroundColor: '#000',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {boxW > 0 && url && (
                <img
                    src={url}
                    alt=''
                    draggable={false}
                    style={{
                        position: 'absolute',
                        left: -crop.x * s,
                        top: -crop.y * s,
                        width: size.width * s,
                        height: size.height * s,
                        pointerEvents: 'none',
                        userSelect: 'none',
                        display: 'block',
                    }}
                />
            )}
        </div>
    );
};

export const RefModCropDialog = ({
    open,
    onClose,
    images,
    refResolution,
    maxTokens,
    latentFrames,
    onCropSlot,
}: {
    open: boolean;
    onClose: () => void;
    images: CropImage[];
    refResolution: number;
    maxTokens: number;
    latentFrames: number;
    onCropSlot: (slotIndex: number, newFilename: string) => void;
}) => {
    const tr = useTranslate();
    const theme = useTheme();
    const apiUrl = useApiURL();
    const tabName = useTabName();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [aspect, setAspect] = useState('');
    const [crop, setCrop] = useState<Crop | null>(null);
    const [processing, setProcessing] = useState(false);

    const cur = images[currentIndex] ?? null;
    const source = useImageSource(open ? cur?.filename : undefined);
    const firstSource = useImageSource(open ? images[0]?.filename : undefined);
    const firstSize = firstSource.size;

    // Start at the first image each time the dialog opens (aspect is kept).
    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
        }
    }, [open]);

    // Default the aspect to the first image's ratio (once known, untouched).
    useEffect(() => {
        if (open && !aspect && firstSize) {
            setAspect(closestAspect(firstSize.width / firstSize.height));
        }
    }, [open, aspect, firstSize]);

    // Reset the crop to the center-crop base when the image / aspect changes.
    useEffect(() => {
        if (source.size && aspect) {
            setCrop(defaultCrop(source.size, aspectRatio(aspect)));
        } else {
            setCrop(null);
        }
    }, [source.size, aspect, currentIndex]);

    const canvas = useMemo(
        () => (firstSize ? computeCanvas(firstSize, refResolution) : null),
        [firstSize, refResolution],
    );
    const tokens = useMemo(
        () =>
            canvas
                ? effectiveTokenCount(
                      canvas,
                      images.length,
                      maxTokens,
                      latentFrames,
                  )
                : null,
        [canvas, images.length, maxTokens, latentFrames],
    );

    // Size the crop view to the selected aspect within a capped height, so the
    // whole dialog fits without scrolling. The height cap comes from the
    // viewport; the width follows from the aspect (and is itself capped so the
    // view never overflows the dialog). Deterministic — no element measurement.
    const [vh, setVh] = useState(window.innerHeight || 800);
    useEffect(() => {
        if (!open) return;
        const update = () => setVh(window.innerHeight);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [open]);

    const aspectNum = aspect ? aspectRatio(aspect) : 1;
    const maxW = Math.min(480, (window.innerWidth || 480) - 64);
    const maxH = Math.max(160, vh - 380);
    const cvH = Math.min(maxH, maxW / aspectNum);
    const cvW = cvH * aspectNum;

    const resetCursor = useCallback((n: number) => {
        setCurrentIndex(Math.max(0, Math.min(images.length - 1, n)));
    }, [images.length]);

    const handleCrop = useCallback(async () => {
        if (!crop || !source.imgEl || !source.blob || !cur) return;
        setProcessing(true);
        try {
            const img = source.imgEl;
            const isJpeg = source.blob.type.includes('jpeg');
            const mime = isJpeg ? 'image/jpeg' : 'image/png';
            const outW = snap32(crop.w);
            const outH = snap32(crop.h);
            const canvasEl = document.createElement('canvas');
            canvasEl.width = outW;
            canvasEl.height = outH;
            const ctx = canvasEl.getContext('2d');
            if (!ctx) throw new Error('2d context unavailable');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                img,
                crop.x,
                crop.y,
                crop.w,
                crop.h,
                0,
                0,
                outW,
                outH,
            );
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvasEl.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
                    mime,
                    0.92,
                );
            });
            const ext = isJpeg ? 'jpg' : 'png';
            const fileName = new Date().getTime() + '_cropped.' + ext;
            const file = new File([blob], fileName, { type: mime });
            const formData = new FormData();
            formData.append('image', file);
            const r = await fetch(apiUrl + '/api/upload/image', {
                method: 'POST',
                body: formData,
            });
            const j = await r.json();
            const newFilename: string = j.name;
            onCropSlot(cur.index, newFilename);
            // Keep the slot's backup in sync (re-upload-on-lost uses it).
            await saveUploadBackup(
                new File([blob], newFilename, { type: mime }),
                `ref_images.${cur.index}.image`,
                tabName,
            );
            if (currentIndex < images.length - 1) {
                setCurrentIndex(currentIndex + 1);
            }
        } catch (e) {
            toast(tr('refmods.crop_failed', { err: String(e) }));
        } finally {
            setProcessing(false);
        }
    }, [
        crop,
        source.imgEl,
        source.blob,
        cur,
        apiUrl,
        onCropSlot,
        tabName,
        currentIndex,
        images.length,
        tr,
    ]);

    const outW = crop ? snap32(crop.w) : 0;
    const outH = crop ? snap32(crop.h) : 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='sm'
            fullWidth
        >
            <DialogTitle>{tr('refmods.crop_title')}</DialogTitle>
            <DialogContent sx={{ minWidth: 300 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography
                            variant='body2'
                            color={theme.palette.text.secondary}
                            mb={0.5}
                        >
                            {tr('refmods.crop_aspect')}
                        </Typography>
                        <Select
                            fullWidth
                            size='small'
                            value={aspect}
                            onChange={(e) => setAspect(e.target.value)}
                        >
                            {ASPECT_LABELS.map((l) => (
                                <MenuItem key={l} value={l}>
                                    {l}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    <Box
                        display='flex'
                        justifyContent='space-between'
                        flexWrap='wrap'
                        gap={1}
                    >
                        <Typography variant='body2'>
                            {tr('refmods.crop_mod_res')}:{' '}
                            {canvas
                                ? `${canvas.width}×${canvas.height}`
                                : '…'}{' '}
                            {tokens
                                ? tokens.overBudget
                                    ? `(${tr('refmods.crop_over_budget')})`
                                    : `(${tokens.tokens.toLocaleString()}` +
                                      (tokens.capped
                                          ? ` / ${tokens.rawTokens.toLocaleString()}`
                                          : '') +
                                      ' tok)'
                                : '…'}
                        </Typography>
                        <Typography variant='body2'>
                            {tr('refmods.crop_out')}: {outW}×{outH}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                width: cvW,
                                height: cvH,
                                borderRadius: 1,
                                overflow: 'hidden',
                            }}
                        >
                            {crop && source.size ? (
                                <CropView
                                    url={source.url}
                                    size={source.size}
                                    aspect={aspectNum}
                                    crop={crop}
                                    onCropChange={setCrop}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'grey.900',
                                    }}
                                >
                                    {source.loading ? (
                                        <CircularProgress />
                                    ) : source.error ? (
                                        <Typography
                                            variant='body2'
                                            color='error'
                                            component='span'
                                        >
                                            {tr('refmods.crop_load_failed')}
                                        </Typography>
                                    ) : null}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Box display='flex' alignItems='center' justifyContent='center' gap={0.5}>
                        <IconButton size='small' disabled={currentIndex === 0} onClick={() => resetCursor(0)}>
                            <FirstPage />
                        </IconButton>
                        <IconButton size='small' disabled={currentIndex === 0} onClick={() => resetCursor(currentIndex - 1)}>
                            <ChevronLeft />
                        </IconButton>
                        <Typography variant='body2' sx={{ minWidth: 48, textAlign: 'center' }}>
                            {currentIndex + 1} / {images.length}
                        </Typography>
                        <IconButton
                            size='small'
                            disabled={currentIndex >= images.length - 1}
                            onClick={() => resetCursor(currentIndex + 1)}
                        >
                            <ChevronRight />
                        </IconButton>
                        <IconButton
                            size='small'
                            disabled={currentIndex >= images.length - 1}
                            onClick={() => resetCursor(images.length - 1)}
                        >
                            <LastPage />
                        </IconButton>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tr('controls.close')}</Button>
                <Button
                    variant='contained'
                    startIcon={<ContentCut />}
                    disabled={!crop || processing || !cur}
                    onClick={handleCrop}
                >
                    {tr('refmods.crop_apply')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
