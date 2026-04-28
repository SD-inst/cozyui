import { Box, Typography, useEventCallback } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController } from 'react-hook-form';
import { useTranslate } from '../../../i18n/I18nContext';
import { MaskEditorControls } from './MaskEditorControls';
import { MaskEditorFullscreenToolbar } from './MaskEditorFullscreenToolbar';
import { useMaskBrush } from './useMaskBrush';

type MouseMode = 'draw' | 'erase' | 'pan';

export interface MaskEditorProps {
    name: string;
    label?: string;
    imageSrc?: string;
    defaultValue?: {
        image: string;
        mask: Uint8Array | number[][];
    };
    brushSizeMin?: number;
    brushSizeMax?: number;
    brushSizeStep?: number;
    defaultBrushSize?: number;
    maskColor?: string;
    maskOpacity?: number;
    sx?: any;
    className?: string;
}

export type MaskValue = {
    image: string;
    mask: Uint8Array | number[][];
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 255, g: 0, b: 0 };
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    };
}

const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 10;

function clampZoom(
    zoom: number,
    imageWidth: number,
    imageHeight: number,
    canvasWidth: number,
    canvasHeight: number,
): number {
    if (
        imageWidth <= 0 ||
        imageHeight <= 0 ||
        canvasWidth <= 0 ||
        canvasHeight <= 0
    )
        return zoom;
    const minZoomX = canvasWidth / imageWidth;
    const minZoomY = canvasHeight / imageHeight;
    const effectiveMinZoom = Math.max(minZoomX, minZoomY);
    return Math.max(zoom, effectiveMinZoom);
}

function clampCamera(
    cam: { x: number; y: number; zoom: number },
    imageWidth: number,
    imageHeight: number,
    canvasWidth: number,
    canvasHeight: number,
): { x: number; y: number; zoom: number } {
    if (
        imageWidth <= 0 ||
        imageHeight <= 0 ||
        canvasWidth <= 0 ||
        canvasHeight <= 0
    )
        return { x: cam.x, y: cam.y, zoom: cam.zoom };

    const minZoomX = canvasWidth / imageWidth;
    const minZoomY = canvasHeight / imageHeight;
    const effectiveMinZoom = Math.max(minZoomX, minZoomY);

    const zoom = Math.max(cam.zoom, effectiveMinZoom);

    const scaledWidth = imageWidth * zoom;
    const scaledHeight = imageHeight * zoom;

    const originX = cam.x + (canvasWidth / 2) * (1 - zoom);
    const originY = cam.y + (canvasHeight / 2) * (1 - zoom);

    const minOriginX = canvasWidth - scaledWidth;
    const maxOriginX = 0;
    const clampedOriginX = Math.max(minOriginX, Math.min(maxOriginX, originX));

    const minOriginY = canvasHeight - scaledHeight;
    const maxOriginY = 0;
    const clampedOriginY = Math.max(minOriginY, Math.min(maxOriginY, originY));

    const x = clampedOriginX - (canvasWidth / 2) * (1 - zoom);
    const y = clampedOriginY - (canvasHeight / 2) * (1 - zoom);

    return { x, y, zoom };
}

function clampOriginForZoom(
    zoom: number,
    originX: number,
    originY: number,
    imageWidth: number,
    imageHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    oldZoom: number,
): { x: number; y: number } {
    if (
        imageWidth <= 0 ||
        imageHeight <= 0 ||
        canvasWidth <= 0 ||
        canvasHeight <= 0
    )
        return { x: originX, y: originY };

    // Clamp origin only when zooming out (newZoom < oldZoom).
    // At zoom in, the computed newOriginX/Y is guaranteed to be in range if oldOrigin was in range.
    if (zoom >= oldZoom) return { x: originX, y: originY };

    const scaledWidth = imageWidth * zoom;
    const scaledHeight = imageHeight * zoom;

    // Only clamp when image is larger than canvas
    if (scaledWidth <= canvasWidth && scaledHeight <= canvasHeight)
        return { x: originX, y: originY };

    const minOriginX = canvasWidth - scaledWidth;
    const maxOriginX = 0;
    const clampedOriginX = Math.max(minOriginX, Math.min(maxOriginX, originX));

    const minOriginY = canvasHeight - scaledHeight;
    const maxOriginY = 0;
    const clampedOriginY = Math.max(minOriginY, Math.min(maxOriginY, originY));

    return { x: clampedOriginX, y: clampedOriginY };
}

interface Ctx {
    canvas: HTMLCanvasElement | null;
    cachedCanvas: HTMLCanvasElement | null;
    maskCanvas: HTMLCanvasElement | null;
    maskImageData: ImageData | null; // cached ImageData for maskCanvas
    maskBuf32: Uint32Array | null; // view over maskImageData.data.buffer
    camera: { x: number; y: number; zoom: number };
    isDrawing: boolean;
    mouseMode: MouseMode;
    lastPos: { x: number; y: number } | null;
    brush: ReturnType<typeof useMaskBrush> | null;
    maskColor: string;
    maskOpacity: number;
    isErasing: boolean;
    imageWidth: number;
    imageHeight: number;
    canvasSize: { width: number; height: number };
    touchMoved: boolean;
    isPinching: boolean;
    lastPinchCenter: { x: number; y: number } | null;
    justLeftPinch: boolean;
    needsRedraw: boolean; // set true when drawing, consumed by rAF loop
    blockDrawAfterPinch: boolean; // block drawing until all fingers lifted after pinch/pan
}

function screenToImageCoords(
    sx: number,
    sy: number,
    canvas: HTMLCanvasElement | null,
    c: Ctx,
): { x: number; y: number } {
    if (!canvas || !c.imageWidth || !c.imageHeight) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Use CSS rect dimensions for screen coordinate conversion
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    // Internal canvas dimensions for render operations
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    // Ratio between CSS and internal dimensions (may differ on high-DPI)
    const cssToCanvasRatioX = canvasW / cssWidth;
    const cssToCanvasRatioY = canvasH / cssHeight;

    // Convert screen coords to internal canvas coords
    const internalX = (sx - rect.left) * cssToCanvasRatioX;
    const internalY = (sy - rect.top) * cssToCanvasRatioY;

    // Camera offset in internal coords
    const oX = c.camera.x + (canvasW / 2) * (1 - c.camera.zoom);
    const oY = c.camera.y + (canvasH / 2) * (1 - c.camera.zoom);
    return {
        x: (internalX - oX) / c.camera.zoom,
        y: (internalY - oY) / c.camera.zoom,
    };
}

function ensureMaskCanvas(c: Ctx) {
    if (
        !c.maskCanvas ||
        c.maskCanvas.width !== c.imageWidth ||
        c.maskCanvas.height !== c.imageHeight
    ) {
        if (c.maskCanvas) c.maskCanvas.remove();
        const mc = document.createElement('canvas');
        mc.width = c.imageWidth;
        mc.height = c.imageHeight;
        c.maskCanvas = mc;
        c.maskImageData = null;
        c.maskBuf32 = null;
    }
}

function updateMaskCanvas(c: Ctx) {
    const maskCanvas = c.maskCanvas;
    if (!maskCanvas) return;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const w = c.imageWidth;
    const h = c.imageHeight;
    const maskData = c.brush?.getMaskData();
    if (!maskData) {
        maskCtx.clearRect(0, 0, w, h);
        c.maskImageData = null;
        c.maskBuf32 = null;
        return;
    }

    const rgb = hexToRgb(c.maskColor);
    const alpha = Math.floor((c.maskOpacity ?? 0.5) * 255);
    const paintedPixel = (alpha << 24) | (rgb.b << 16) | (rgb.g << 8) | rgb.r;
    const clearPixel = 0;

    // Reuse cached ImageData / Uint32Array buffer
    if (
        !c.maskImageData ||
        c.maskImageData.width !== w ||
        c.maskImageData.height !== h
    ) {
        c.maskImageData = maskCtx.createImageData(w, h);
    }
    if (!c.maskBuf32) {
        c.maskBuf32 = new Uint32Array(c.maskImageData.data.buffer);
    }

    const buf = c.maskBuf32;
    // Only update pixels that changed
    for (let i = 0; i < maskData.length; i++) {
        buf[i] = maskData[i] ? paintedPixel : clearPixel;
    }
    maskCtx.putImageData(c.maskImageData, 0, 0);
}

function performRedraw(c: Ctx) {
    const canvas = c.canvas;
    if (!canvas || !c.imageWidth || !c.imageHeight || !c.brush || !c.maskColor)
        return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ensureMaskCanvas(c);
    updateMaskCanvas(c);

    // Composite: black bg → image → mask overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
        c.camera.zoom,
        0,
        0,
        c.camera.zoom,
        c.camera.x + (canvas.width / 2) * (1 - c.camera.zoom),
        c.camera.y + (canvas.height / 2) * (1 - c.camera.zoom),
    );
    if (c.cachedCanvas)
        ctx.drawImage(c.cachedCanvas, 0, 0, c.imageWidth, c.imageHeight);
    if (c.maskCanvas) {
        ctx.drawImage(c.maskCanvas, 0, 0);
    }
}

// Request redraw via rAF — batches multiple mousemove events into one draw call
function requestRedraw(c: Ctx) {
    c.needsRedraw = true;
}

export const MaskEditor = ({
    name,
    imageSrc: imageSrcProp,
    defaultValue,
    brushSizeMin,
    brushSizeMax,
    brushSizeStep,
    defaultBrushSize = 30,
    maskColor: defaultMaskColor = '#ff0000',
    maskOpacity: defaultMaskOpacity = 0.5,
    sx,
    className,
}: MaskEditorProps) => {
    const tr = useTranslate();
    const {
        field: { value, onChange },
    } = useController({ name, defaultValue });
    const imageSrc =
        imageSrcProp ??
        (value && typeof value === 'object' && 'image' in value
            ? (value as any).image
            : (defaultValue?.image ?? ''));

    const [brushSize, setBrushSize] = useState(defaultBrushSize);
    const [maskColor, setMaskColor] = useState(defaultMaskColor);
    const [maskOpacity, setMaskOpacity] = useState(defaultMaskOpacity);
    const [isErasing, setIsErasing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
    const [toolbarHeight, setToolbarHeight] = useState(0);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const maskDataRef = useRef<Uint8Array>(new Uint8Array(0));
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // Single ref object for all mutable values
    const ctxRef = useRef<Ctx>({
        canvas: null,
        cachedCanvas: null,
        maskCanvas: null,
        maskImageData: null,
        maskBuf32: null,
        camera: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
        isDrawing: false,
        mouseMode: 'draw',
        lastPos: null,
        brush: null,
        maskColor,
        maskOpacity,
        isErasing,
        imageWidth: 0,
        imageHeight: 0,
        canvasSize: { width: 0, height: 0 },
        touchMoved: false,
        isPinching: false,
        lastPinchCenter: null,
        justLeftPinch: false,
        needsRedraw: false,
        blockDrawAfterPinch: false,
    });

    // rAF loop — draws only when needsRedraw is true
    useEffect(() => {
        let rafId = 0;
        const loop = () => {
            const c = ctxRef.current;
            if (
                c.needsRedraw &&
                c.canvas &&
                c.imageWidth > 0 &&
                c.imageHeight > 0
            ) {
                c.needsRedraw = false;
                performRedraw(c);
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const prevImageSrcRef = useRef<string | undefined>(undefined);

    const handleStateChange = useCallback(
        (canUndo: boolean, canRedo: boolean) => {
            setCanUndo(canUndo);
            setCanRedo(canRedo);
        },
        [],
    );

    const brush = useMaskBrush(1, 1, brushSize, handleStateChange);
    ctxRef.current.brush = brush;

    // Initialize undo/redo state from brush
    useEffect(() => {
        setCanUndo(brush.getCanUndo());
        setCanRedo(brush.getCanRedo());
    }, [brush]);

    useEffect(() => {
        if (imageWidth > 0 && imageHeight > 0)
            ctxRef.current.brush?.setDimensions(imageWidth, imageHeight);
    }, [imageWidth, imageHeight]);

    useEffect(() => {
        ctxRef.current.brush?.setBrushSize(brushSize);
    }, [brushSize]);
    useEffect(() => {
        const c = ctxRef.current;
        c.imageWidth = imageWidth;
        c.imageHeight = imageHeight;
        c.canvasSize = canvasSize;
    }, [imageWidth, imageHeight, canvasSize]);

    useEffect(() => {
        ctxRef.current.maskColor = maskColor;
        requestRedraw(ctxRef.current);
    }, [maskColor]);

    useEffect(() => {
        ctxRef.current.maskOpacity = maskOpacity;
        requestRedraw(ctxRef.current);
    }, [maskOpacity]);

    useEffect(() => {
        ctxRef.current.isErasing = isErasing;
    }, [isErasing]);

    const onMaskChange = useCallback(
        (maskData: Uint8Array) => {
            maskDataRef.current = maskData;
            // Create a copy to ensure react-hook-form detects the change
            onChange(new Uint8Array(maskData));
        },
        [onChange]
    );

    const undo = useEventCallback(() => {
        const c = ctxRef.current;
        if (!c.brush || !c.brush.undo()) return false;
        requestRedraw(c);
        onMaskChange(c.brush.getMaskData());
        return true;
    });

    const redo = useEventCallback(() => {
        const c = ctxRef.current;
        if (!c.brush || !c.brush.redo()) return false;
        requestRedraw(c);
        onMaskChange(c.brush.getMaskData());
        return true;
    });

    const resetMask = useEventCallback(() => {
        const c = ctxRef.current;
        if (!c.imageWidth || !c.imageHeight) return;
        c.brush?.reset();
        requestRedraw(c);
        onMaskChange(c.brush?.getMaskData() || new Uint8Array());
    });

    // Clear mask when image source changes (also clears undo/redo stacks)
    useEffect(() => {
        if (prevImageSrcRef.current !== undefined && prevImageSrcRef.current !== imageSrc && imageWidth > 0 && imageHeight > 0) {
            const c = ctxRef.current;
            if (!defaultValue?.mask) {
                c.brush?.clear();
                requestRedraw(c);
                onMaskChange(c.brush?.getMaskData() || new Uint8Array());
            }
        }
        prevImageSrcRef.current = imageSrc;
    }, [imageSrc, imageWidth, imageHeight, defaultValue, onMaskChange]);

    // Native touch handlers for mobile — React's passive listeners block preventDefault
    const nativeTouchRef = useRef<{
        isSetup: boolean;
        touchStartHandler: ((e: TouchEvent) => void) | null;
        touchMoveHandler: ((e: TouchEvent) => void) | null;
        touchEndHandler: ((e: TouchEvent) => void) | null;
    }>({
        isSetup: false,
        touchStartHandler: null,
        touchMoveHandler: null,
        touchEndHandler: null,
    });

    useEffect(() => {
        const canvas = ctxRef.current.canvas;
        if (!canvas) return;

        const touchStartHandler = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const c = ctxRef.current;
            const touches = e.touches;

            // Two-finger: start pinch/pan, reset drawing state
            if (touches.length === 2) {
                c.isDrawing = false;
                c.lastPos = null;
                c.touchMoved = false;
                c.isPinching = true;
                c.lastPinchCenter = null;
                const t1 = touches[0],
                    t2 = touches[1];
                const dist = Math.hypot(
                    t2.clientX - t1.clientX,
                    t2.clientY - t1.clientY,
                );
                const centerX = (t1.clientX + t2.clientX) / 2;
                const centerY = (t1.clientY + t2.clientY) / 2;
                // Initialize pinch state for incremental updates
                (canvas as HTMLElement).dataset.pinchDist = String(dist);
                (canvas as HTMLElement).dataset.lastPinchCenterX =
                    String(centerX);
                (canvas as HTMLElement).dataset.lastPinchCenterY =
                    String(centerY);
                return;
            }

            // Single finger: just track position, DON'T paint yet
            // Painting happens in touchMove when the user actually drags
            if (touches.length === 1 && c.imageWidth > 0 && c.imageHeight > 0) {
                c.isDrawing = true;
                c.touchMoved = false;
                c.lastPos = null; // Reset so touchMove always draws at least one segment
                // If we just finished a pinch/pan, block drawing until all fingers lift
                if (c.blockDrawAfterPinch) {
                    c.isDrawing = false;
                }
            }
        };

        const touchMoveHandler = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const c = ctxRef.current;
            const canvasEl = canvas as HTMLElement;
            const touches = e.touches;

            if (touches.length === 2) {
                const t1 = touches[0],
                    t2 = touches[1];

                // Current pinch state
                const currentDist = Math.hypot(
                    t2.clientX - t1.clientX,
                    t2.clientY - t1.clientY,
                );
                const currentCenterX = (t1.clientX + t2.clientX) / 2;
                const currentCenterY = (t1.clientY + t2.clientY) / 2;

                // Previous pinch state (from dataset or initial)
                const prevDist = parseFloat(
                    canvasEl.dataset.pinchDist || String(currentDist),
                );
                const prevCenterX = parseFloat(
                    canvasEl.dataset.lastPinchCenterX || String(currentCenterX),
                );
                const prevCenterY = parseFloat(
                    canvasEl.dataset.lastPinchCenterY || String(currentCenterY),
                );

                c.isPinching = true;

                // Convert CSS pixel displacement to internal canvas pixel displacement
                const cssToInternalRatioX =
                    canvas.width / canvas.getBoundingClientRect().width;
                const cssToInternalRatioY =
                    canvas.height / canvas.getBoundingClientRect().height;
                const panX =
                    (currentCenterX - prevCenterX) * cssToInternalRatioX;
                const panY =
                    (currentCenterY - prevCenterY) * cssToInternalRatioY;

                // Compute zoom scale from distance ratio
                const zoomScale = prevDist > 0 ? currentDist / prevDist : 1;

                // Apply zoom to current camera state
                const canvasW = canvas.width;
                const canvasH = canvas.height;
                const currentZoom = c.camera.zoom;
                const newZoom = clampZoom(
                    Math.min(MAX_ZOOM, currentZoom * zoomScale),
                    c.imageWidth,
                    c.imageHeight,
                    canvasW,
                    canvasH,
                );

                // Camera transform: imageX -> screenX = camera.zoom * imageX + originX
                // where originX = camera.x + (canvas.width / 2) * (1 - camera.zoom)
                //
                // For pinch-to-zoom, the image point at pinch center must stay under fingers:
                //   screenCenterX = currentZoom * imageCenterX + currentOriginX
                //   => imageCenterX = (screenCenterX_internal - currentOriginX) / currentZoom
                //
                // After zoom+pan:
                //   newOriginX = screenCenterX_internal - newZoom * imageCenterX + panX
                //            = screenCenterX_internal - newZoom * ((screenCenterX_internal - currentOriginX) / currentZoom) + panX

                const currentOriginX =
                    c.camera.x + (canvasW / 2) * (1 - currentZoom);
                const currentOriginY =
                    c.camera.y + (canvasH / 2) * (1 - currentZoom);

                // Convert current pinch center to internal canvas coords
                const screenCenterXInternal =
                    (currentCenterX - canvas.getBoundingClientRect().left) *
                    cssToInternalRatioX;
                const screenCenterYInternal =
                    (currentCenterY - canvas.getBoundingClientRect().top) *
                    cssToInternalRatioY;

                // Image coordinate of the pinch center
                const imageCenterX =
                    (screenCenterXInternal - currentOriginX) / currentZoom;
                const imageCenterY =
                    (screenCenterYInternal - currentOriginY) / currentZoom;

                // New origin: keep the same image point under the pinch center, then apply pan
                const newOriginX =
                    screenCenterXInternal - newZoom * imageCenterX + panX;
                const newOriginY =
                    screenCenterYInternal - newZoom * imageCenterY + panY;

                const finalCameraX = newOriginX - (canvasW / 2) * (1 - newZoom);
                const finalCameraY = newOriginY - (canvasH / 2) * (1 - newZoom);

                // Clamp once at the end to prevent black bars
                const clampedCam = clampCamera(
                    { x: finalCameraX, y: finalCameraY, zoom: newZoom },
                    c.imageWidth,
                    c.imageHeight,
                    canvas.width,
                    canvas.height,
                );
                c.camera.x = clampedCam.x;
                c.camera.y = clampedCam.y;
                c.camera.zoom = clampedCam.zoom;

                // Update pinch state for next move
                (canvas as HTMLElement).dataset.pinchDist = String(currentDist);
                (canvas as HTMLElement).dataset.lastPinchCenterX =
                    String(currentCenterX);
                (canvas as HTMLElement).dataset.lastPinchCenterY =
                    String(currentCenterY);

                requestRedraw(c);
                return;
            }

            // Single finger drawing — only paint when dragging
            if (
                touches.length === 1 &&
                c.isDrawing &&
                c.imageWidth > 0 &&
                c.imageHeight > 0
            ) {
                const pos = screenToImageCoords(
                    touches[0].clientX,
                    touches[0].clientY,
                    canvas,
                    c,
                );
                if (c.touchMoved && c.lastPos) {
                    // Normal drawing — paint/erase line from last position
                    // Save state on first stroke of a new stroke (when undo stack is empty)
                    if (!c.brush?.getCanUndo()) {
                        c.brush?.saveState();
                    }
                    const dx = pos.x - c.lastPos.x,
                        dy = pos.y - c.lastPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const step = Math.max(1, Math.floor(dist / 2));
                    for (let i = 0; i <= step; i++) {
                        const t = i / step;
                        if (c.isErasing) {
                            c.brush?.eraseAt(
                                c.lastPos.x + dx * t,
                                c.lastPos.y + dy * t,
                            );
                        } else {
                            c.brush?.paintAt(
                                c.lastPos.x + dx * t,
                                c.lastPos.y + dy * t,
                            );
                        }
                    }
                    c.lastPos = { x: pos.x, y: pos.y };
                } else if (!c.touchMoved && c.lastPos) {
                    // First move after touchStart — save state and paint/erase
                    c.brush?.saveState();
                    const dx = pos.x - c.lastPos.x,
                        dy = pos.y - c.lastPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const step = Math.max(1, Math.floor(dist / 2));
                    for (let i = 0; i <= step; i++) {
                        const t = i / step;
                        if (c.isErasing) {
                            c.brush?.eraseAt(
                                c.lastPos.x + dx * t,
                                c.lastPos.y + dy * t,
                            );
                        } else {
                            c.brush?.paintAt(
                                c.lastPos.x + dx * t,
                                c.lastPos.y + dy * t,
                            );
                        }
                    }
                    c.lastPos = { x: pos.x, y: pos.y };
                    c.touchMoved = true;
                    c.justLeftPinch = false;
                } else if (c.blockDrawAfterPinch) {
                    // Still blocking drawing after pinch/pan, just track position
                    c.lastPos = { x: pos.x, y: pos.y };
                } else if (!c.touchMoved && !c.lastPos && !c.justLeftPinch) {
                    // First touch after touchStart — just set position
                    c.lastPos = { x: pos.x, y: pos.y };
                } else if (!c.touchMoved && !c.lastPos && c.justLeftPinch) {
                    // First touch after pinch-to-drag — just set position, don't paint
                    c.lastPos = { x: pos.x, y: pos.y };
                    c.touchMoved = true;
                    c.justLeftPinch = false;
                }
                if (c.touchMoved) {
                    requestRedraw(c);
                }
            }
        };

        const touchEndHandler = (e: TouchEvent) => {
            e.preventDefault();
            const c = ctxRef.current;
            const touches = e.touches;
            if (touches.length === 0) {
                // All fingers lifted — unblock drawing after pinch/pan
                c.blockDrawAfterPinch = false;
                if (c.isDrawing) {
                    c.isDrawing = false;
                    c.lastPos = null;
                    onMaskChange(
                        c.brush?.getMaskData() || new Uint8Array(),
                    );
                }
                if (c.isPinching) {
                    c.isPinching = false;
                    c.lastPinchCenter = null;
                }
            } else if (touches.length === 1) {
                if (c.isPinching) {
                    // User released one finger during pinch — just stop pinching.
                    // Do NOT start drawing; user must lift this finger and touch
                    // again to begin a new stroke.
                    c.isPinching = false;
                    c.lastPinchCenter = null;
                    c.blockDrawAfterPinch = true; // block until all fingers lift
                }
                // Track position for continued drawing (but don't paint)
                if (!c.justLeftPinch) {
                    const pos = screenToImageCoords(
                        touches[0].clientX,
                        touches[0].clientY,
                        canvas,
                        c,
                    );
                    c.lastPos = { x: pos.x, y: pos.y };
                }
            }
        };

        canvas.addEventListener('touchstart', touchStartHandler, {
            passive: false,
            capture: true,
        });
        canvas.addEventListener('touchmove', touchMoveHandler, {
            passive: false,
            capture: true,
        });
        canvas.addEventListener('touchend', touchEndHandler, {
            passive: false,
            capture: true,
        });

        nativeTouchRef.current = {
            isSetup: true,
            touchStartHandler,
            touchMoveHandler,
            touchEndHandler,
        };

        return () => {
            canvas.removeEventListener('touchstart', touchStartHandler, {
                capture: true,
            });
            canvas.removeEventListener('touchmove', touchMoveHandler, {
                capture: true,
            });
            canvas.removeEventListener('touchend', touchEndHandler, {
                capture: true,
            });
            nativeTouchRef.current.isSetup = false;
        };
    }, [onMaskChange]);

    // Prevent page scroll on mouse wheel zoom
    useEffect(() => {
        const handler = (e: WheelEvent) => {
            if (
                ctxRef.current.canvas &&
                ctxRef.current.canvas.contains(e.target as Node)
            ) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('wheel', handler, { passive: false });
        return () => window.removeEventListener('wheel', handler);
    }, []);

    // Image loading
    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.onload = () => {
            setImageSize({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            setImageWidth(img.naturalWidth);
            setImageHeight(img.naturalHeight);
            const c = ctxRef.current;
            if (defaultValue?.mask) {
                const mask = defaultValue.mask;
                if (Array.isArray(mask) && Array.isArray(mask[0])) {
                    const flat = new Uint8Array(
                        img.naturalWidth * img.naturalHeight,
                    );
                    for (
                        let y = 0;
                        y < Math.min(mask.length, img.naturalHeight);
                        y++
                    )
                        for (
                            let x = 0;
                            x <
                            Math.min(mask[y]?.length ?? 0, img.naturalWidth);
                            x++
                        )
                            flat[y * img.naturalWidth + x] = mask[y][x] ?? 0;
                    maskDataRef.current = flat;
                } else if (mask instanceof Uint8Array) {
                    const newMask = new Uint8Array(
                        img.naturalWidth * img.naturalHeight,
                    );
                    newMask.set(
                        mask.subarray(0, Math.min(mask.length, newMask.length)),
                    );
                    maskDataRef.current = newMask;
                }
            }
            const cachedCanvas = document.createElement('canvas');
            cachedCanvas.width = img.naturalWidth;
            cachedCanvas.height = img.naturalHeight;
            const cachedCtx = cachedCanvas.getContext('2d');
            if (cachedCtx) {
                cachedCtx.drawImage(img, 0, 0);
                c.cachedCanvas = cachedCanvas;
            }
        };
        img.src = imageSrc;
    }, [imageSrc, defaultValue]);

    // Initialize camera when image loads with correct fit-to-canvas zoom
    useEffect(() => {
        if (
            imageWidth <= 0 ||
            imageHeight <= 0 ||
            containerWidth <= 0 ||
            containerHeight <= 0
        )
            return;
        const c = ctxRef.current;
        const canvas = c.canvas;
        if (!canvas) return;
        // Only set initial camera if it hasn't been adjusted yet (zoom is still DEFAULT_ZOOM)
        if (c.camera.zoom !== DEFAULT_ZOOM) return;

        const minZoomX = containerWidth / imageWidth;
        const minZoomY = containerHeight / imageHeight;
        const fitZoom = Math.max(minZoomX, minZoomY);

        c.camera.zoom = fitZoom;
        c.camera.x = 0;
        c.camera.y = 0;
        requestRedraw(c);
    }, [imageWidth, imageHeight, containerWidth, containerHeight]);

    // ResizeObserver
    useEffect(() => {
        const container = ctxRef.current.canvas
            ?.parentElement as HTMLDivElement | null;
        if (!container) return;
        const updateSize = () => {
            const r = container.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                setContainerWidth(r.width);
                setContainerHeight(r.height);
            }
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Collapsed toolbar height (toggle bar only)
    const COLLAPSED_TOOLBAR_HEIGHT = 48;

    // Calculate effective toolbar height
    const effectiveToolbarHeight = isFullscreen
        ? isToolbarExpanded
            ? toolbarHeight
            : COLLAPSED_TOOLBAR_HEIGHT
        : 0;

    // Calculate canvas size
    useEffect(() => {
        if (imageWidth <= 0 || imageHeight <= 0 || containerHeight <= 0) {
            setCanvasSize({ width: 0, height: 0 });
            return;
        }
        const effectiveHeight = containerHeight - effectiveToolbarHeight;
        if (effectiveHeight <= 0) {
            setCanvasSize({ width: 0, height: 0 });
            return;
        }
        const targetAspect = imageWidth / imageHeight;
        const containerAspect = containerWidth / effectiveHeight;
        let width: number, height: number;
        if (containerAspect > targetAspect) {
            height = effectiveHeight;
            width = Math.round(height * targetAspect);
        } else {
            width = containerWidth;
            height = Math.round(width / targetAspect);
        }
        setCanvasSize({ width, height });
    }, [
        imageWidth,
        imageHeight,
        containerWidth,
        containerHeight,
        effectiveToolbarHeight,
    ]);

    // Sync canvas size with CSS on every render (fix artifacts)
    useEffect(() => {
        const canvas = ctxRef.current.canvas;
        if (!canvas || imageWidth <= 0 || imageHeight <= 0) return;
        const cssWidth = Math.round(canvas.getBoundingClientRect().width);
        const cssHeight = Math.round(canvas.getBoundingClientRect().height);
        if (cssWidth > 0 && cssHeight > 0) {
            if (canvas.width !== cssWidth || canvas.height !== cssHeight) {
                canvas.width = cssWidth;
                canvas.height = cssHeight;
                ctxRef.current.canvasSize = {
                    width: cssWidth,
                    height: cssHeight,
                };
                const clamped = clampCamera(
                    ctxRef.current.camera,
                    ctxRef.current.imageWidth,
                    ctxRef.current.imageHeight,
                    cssWidth,
                    cssHeight,
                );
                ctxRef.current.camera.x = clamped.x;
                ctxRef.current.camera.y = clamped.y;
                ctxRef.current.camera.zoom = clamped.zoom;
                requestRedraw(ctxRef.current);
            }
        }
    });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const c = ctxRef.current,
            canvas = c.canvas;
        if (!canvas) return;
        // Shift+left-click for pan
        if (e.shiftKey && e.button === 0) {
            c.mouseMode = 'pan';
            return;
        }
        if (e.button === 1) {
            c.mouseMode = 'pan';
            return;
        }
        if (e.button === 0 && c.imageWidth > 0 && c.imageHeight > 0) {
            c.isDrawing = true;
            c.mouseMode = c.isErasing ? 'erase' : 'draw';
            c.brush?.saveState();
            const pos = screenToImageCoords(e.clientX, e.clientY, canvas, c);
            if (c.isErasing) {
                c.brush?.eraseAt(pos.x, pos.y);
            } else {
                c.brush?.paintAt(pos.x, pos.y);
            }
            c.lastPos = { x: pos.x, y: pos.y };
            requestRedraw(c);
        }
        if (e.button === 2 && c.imageWidth > 0 && c.imageHeight > 0) {
            c.isDrawing = true;
            c.mouseMode = 'erase';
            c.brush?.saveState();
            const pos = screenToImageCoords(e.clientX, e.clientY, canvas, c);
            c.brush?.eraseAt(pos.x, pos.y);
            c.lastPos = { x: pos.x, y: pos.y };
            requestRedraw(c);
        }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const c = ctxRef.current,
            canvas = c.canvas;
        if (!canvas) return;
        if (c.mouseMode === 'pan') {
            c.camera.x += e.movementX;
            c.camera.y += e.movementY;
            const clamped = clampCamera(
                c.camera,
                c.imageWidth,
                c.imageHeight,
                canvas.width,
                canvas.height,
            );
            c.camera.x = clamped.x;
            c.camera.y = clamped.y;
            c.camera.zoom = clamped.zoom;
            requestRedraw(c);
            return;
        }
        if (!c.isDrawing || !c.imageWidth || !c.imageHeight) return;
        const pos = screenToImageCoords(e.clientX, e.clientY, canvas, c);
        if (c.lastPos) {
            const dx = pos.x - c.lastPos.x,
                dy = pos.y - c.lastPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = Math.max(1, Math.floor(dist / 2));
            for (let i = 0; i <= step; i++) {
                const t = i / step;
                if (c.mouseMode === 'erase') {
                    c.brush?.eraseAt(
                        c.lastPos.x + dx * t,
                        c.lastPos.y + dy * t,
                    );
                } else {
                    c.brush?.paintAt(
                        c.lastPos.x + dx * t,
                        c.lastPos.y + dy * t,
                    );
                }
            }
        } else {
            if (c.mouseMode === 'erase') {
                c.brush?.eraseAt(pos.x, pos.y);
            } else {
                c.brush?.paintAt(pos.x, pos.y);
            }
        }
        c.lastPos = { x: pos.x, y: pos.y };
        requestRedraw(c);
    }, []);

    const handleMouseUp = useEventCallback(() => {
        const c = ctxRef.current;
        if (c.mouseMode === 'pan') {
            c.mouseMode = 'draw';
            return;
        }
        if (c.isDrawing) {
            c.isDrawing = false;
            c.mouseMode = 'draw';
            c.lastPos = null;
            onMaskChange(c.brush?.getMaskData() || new Uint8Array());
        }
    });

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const c = ctxRef.current,
            canvas = c.canvas;
        if (!canvas) return;
        const rawZoom = c.camera.zoom * (1 - e.deltaY * 0.001);
        const newZoom = clampZoom(
            Math.min(MAX_ZOOM, rawZoom),
            c.imageWidth,
            c.imageHeight,
            canvas.width,
            canvas.height,
        );
        if (newZoom === c.camera.zoom) return;
        const pos = screenToImageCoords(e.clientX, e.clientY, canvas, c);
        const oldZoom = c.camera.zoom;
        const oldOriginX = c.camera.x + (canvas.width / 2) * (1 - oldZoom);
        const oldOriginY = c.camera.y + (canvas.height / 2) * (1 - oldZoom);
        // screenX = originX + zoom * pos.x must stay constant during zoom
        // newOriginX = oldOriginX + (oldZoom - newZoom) * pos.x
        const newOriginX = oldOriginX + (oldZoom - newZoom) * pos.x;
        const newOriginY = oldOriginY + (oldZoom - newZoom) * pos.y;
        const clamped = clampOriginForZoom(
            newZoom,
            newOriginX,
            newOriginY,
            c.imageWidth,
            c.imageHeight,
            canvas.width,
            canvas.height,
            oldZoom,
        );
        c.camera.x = clamped.x - (canvas.width / 2) * (1 - newZoom);
        c.camera.y = clamped.y - (canvas.height / 2) * (1 - newZoom);
        c.camera.zoom = newZoom;
        // Final clamp to prevent black bars at any zoom level
        const clampedCam = clampCamera(
            c.camera,
            c.imageWidth,
            c.imageHeight,
            canvas.width,
            canvas.height,
        );
        c.camera.x = clampedCam.x;
        c.camera.y = clampedCam.y;
        c.camera.zoom = clampedCam.zoom;
        requestRedraw(c);
    }, []);

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => e.preventDefault(),
        [],
    );

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isUndo =
                (e.ctrlKey || e.metaKey) &&
                !e.shiftKey &&
                e.key.toLowerCase() === 'z';
            const isRedo =
                (e.ctrlKey || e.metaKey) &&
                e.shiftKey &&
                e.key.toLowerCase() === 'z';
            if (isUndo) {
                e.preventDefault();
                undo();
            } else if (isRedo) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    // React touch handlers kept as fallback but native handlers take precedence via capture phase

    const handleReset = useCallback(() => {
        resetMask();
    }, [resetMask]);

    const containerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const enterFullscreen = useCallback(() => {
        const el = containerRef.current;
        if (el) el.requestFullscreen().catch(() => {});
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Measure toolbar height when entering fullscreen and redraw canvas
    useEffect(() => {
        if (!isFullscreen || !toolbarRef.current) return;
        const updateHeight = () => {
            const h = toolbarRef.current?.getBoundingClientRect().height ?? 0;
            setToolbarHeight(h);
        };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(toolbarRef.current);
        return () => observer.disconnect();
    }, [isFullscreen]);

    if (!imageSrc) {
        return (
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 100,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 2,
                }}
            >
                <Typography variant='body2' color='text.secondary'>
                    {tr('controls.mask_editor.no_image')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{ ...sx, overscrollBehavior: 'none' }}
            className={className}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    overflow: 'hidden',
                    bgcolor: '#000',
                    borderRadius: 1,
                    minHeight: 200,
                    ...(imageSize.width > 0 && imageSize.height > 0
                        ? {
                              aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                          }
                        : {}),
                    ...(isFullscreen
                        ? {
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 9999,
                              borderRadius: 0,
                              aspectRatio: 'unset',
                          }
                        : {}),
                }}
            >
                <canvas
                    ref={(el) => {
                        ctxRef.current.canvas = el;
                    }}
                    style={{
                        touchAction: 'none',
                        userSelect: 'none',
                        position: 'absolute',
                        top: isFullscreen ? effectiveToolbarHeight : 0,
                        left: 0,
                        width: '100%',
                        height: isFullscreen
                            ? `calc(100% - ${effectiveToolbarHeight}px)`
                            : '100%',
                        zIndex: 1,
                        imageRendering: 'auto',
                        pointerEvents: 'auto',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                />
                {isFullscreen && (
                    <MaskEditorFullscreenToolbar
                        ref={toolbarRef}
                        brushSize={brushSize}
                        onBrushSizeChange={setBrushSize}
                        maskColor={maskColor}
                        onMaskColorChange={setMaskColor}
                        maskOpacity={maskOpacity}
                        onMaskOpacityChange={setMaskOpacity}
                        isErasing={isErasing}
                        onToggleErasing={() => setIsErasing((v) => !v)}
                        onReset={handleReset}
                        onExitFullscreen={() => {
                            if (document.fullscreenElement) {
                                document.exitFullscreen().catch(() => {});
                            }
                            setIsFullscreen(false);
                        }}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        brushSizeMin={brushSizeMin}
                        brushSizeMax={brushSizeMax}
                        brushSizeStep={brushSizeStep}
                        isExpanded={isToolbarExpanded}
                        onToggle={() => setIsToolbarExpanded((v) => !v)}
                    />
                )}
            </Box>
            {!isFullscreen && (
                <MaskEditorControls
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    maskColor={maskColor}
                    onMaskColorChange={setMaskColor}
                    maskOpacity={maskOpacity}
                    onMaskOpacityChange={setMaskOpacity}
                    isErasing={isErasing}
                    onToggleErasing={() => setIsErasing((v) => !v)}
                    onReset={handleReset}
                    onToggleFullscreen={() => enterFullscreen()}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    brushSizeMin={brushSizeMin}
                    brushSizeMax={brushSizeMax}
                    brushSizeStep={brushSizeStep}
                />
            )}
        </Box>
    );
};
