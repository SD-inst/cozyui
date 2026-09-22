import * as React from 'react';
import {
    type Plugin,
    type Render,
    type RenderFunction,
    type RenderSlideProps,
    type ContainerRect,
    type Callback,
    CLASS_FULLSIZE,
    CLASS_FLEX_CENTER,
    CLASS_SLIDE_WRAPPER,
    CLASS_SLIDE_WRAPPER_INTERACTIVE,
    EVENT_ON_KEY_DOWN,
    EVENT_ON_WHEEL,
    EVENT_ON_POINTER_DOWN,
    EVENT_ON_POINTER_MOVE,
    EVENT_ON_POINTER_UP,
    EVENT_ON_POINTER_LEAVE,
    EVENT_ON_POINTER_CANCEL,
    PLUGIN_ZOOM,
    useLightboxProps,
    useMotionPreference,
    useEventCallback,
    useLayoutEffect,
    useLightboxState,
    isImageSlide,
    isImageFitCover,
    round,
    useDocumentContext,
    useController,
    cleanup,
    makeUseContext,
    createIcon,
    IconButton,
    ImageSlide,
    clsx,
    cssClass,
    addToolbarButton,
    createModule,
} from 'yet-another-react-lightbox';

// The library's Zoom plugin ships these prop/type augmentations in its own
// `plugins/zoom` module (loaded only when that module is imported). Since we
// replace it, we declare the same augmentations here so consumers' `zoom` prop,
// `animation.zoom`, toolbar render slots and labels keep their types.
declare module 'yet-another-react-lightbox' {
    interface LightboxProps {
        /** Zoom plugin settings */
        zoom?: {
            /** Zoom plugin ref */
            ref?: React.ForwardedRef<ZoomRef>;
            /** ratio of image pixels to physical pixels at maximum zoom level */
            maxZoomPixelRatio?: number;
            /** zoom-in multiplier */
            zoomInMultiplier?: number;
            /** @deprecated - double-tap maximum time delay */
            doubleTapDelay?: number;
            /** @deprecated - double-click maximum time delay */
            doubleClickDelay?: number;
            /** maximum number of zoom-in stops via double-click or double-tap */
            doubleClickMaxStops?: number;
            /** keyboard move distance */
            keyboardMoveDistance?: number;
            /** wheel zoom distance factor */
            wheelZoomDistanceFactor?: number;
            /** pinch zoom distance factor */
            pinchZoomDistanceFactor?: number;
            /** if `true`, enables image zoom via scroll gestures for mouse and trackpad users */
            scrollToZoom?: boolean;
        };
    }
    interface AnimationSettings {
        /** zoom animation duration */
        zoom?: number;
    }
    interface Render {
        /** render custom Zoom control in the toolbar */
        buttonZoom?: RenderFunction<ZoomRef>;
        /** render custom Zoom In icon */
        iconZoomIn?: RenderFunction;
        /** render custom Zoom Out icon */
        iconZoomOut?: RenderFunction;
    }
    interface Labels {
        'Zoom in'?: string;
        'Zoom out'?: string;
    }
    interface RenderSlideProps {
        /** current zoom level */
        zoom?: number;
        /** maximum zoom level */
        maxZoom?: number;
    }
    interface Callbacks {
        /** zoom callback */
        zoom?: Callback<ZoomCallbackProps>;
    }
    /** Zoom callback props */
    interface ZoomCallbackProps {
        /** current zoom level */
        zoom: number;
    }
    interface ToolbarButtonKeys {
        [PLUGIN_ZOOM]: null;
    }
    /** Zoom plugin ref */
    interface ZoomRef {
        /** current zoom level */
        zoom: number;
        /** maximum zoom level */
        maxZoom: number;
        /** horizontal offset */
        offsetX: number;
        /** vertical offset */
        offsetY: number;
        /** if `true`, zoom is unavailable for the current slide */
        disabled: boolean;
        /** increase zoom level using `zoomInMultiplier` */
        zoomIn: Callback;
        /** decrease zoom level using `zoomInMultiplier` */
        zoomOut: Callback;
        /** change zoom level */
        changeZoom: (targetZoom: number, rapid?: boolean, dx?: number, dy?: number) => void;
    }
}

// A fork of the library's Zoom plugin (yet-another-react-lightbox v3.22) with two
// intentional behavioural differences for comparing fine details across several
// images:
//
//   1. Zoom level + camera offset are NOT reset when the slide changes, so the
//      same region stays in view while switching between images. On each slide the
//      persisted offset is clamped to that slide's bounds (so a smaller image does
//      not show empty space).
//
//   2. Keyboard panning uses Ctrl+Arrows (not plain arrows). Plain arrows keep the
//      library's default behaviour and switch slides, preserving the view.
//
// Everything else (pointer pan, wheel zoom, pinch, double-click, toolbar buttons)
// is identical to the stock plugin.

type ImageDimensions = { width: number; height: number };
type ZoomWrapperState = {
    zoomWrapperRef: React.RefObject<HTMLDivElement>;
    imageDimensions?: ImageDimensions;
};
type PointerState = { pointerId: number; clientX: number; clientY: number; pageX: number; pageY: number };

interface ZoomContextValue {
    zoom: number;
    maxZoom: number;
    offsetX: number;
    offsetY: number;
    disabled: boolean;
    zoomIn: () => void;
    zoomOut: () => void;
    changeZoom: (targetZoom: number, rapid?: boolean, dx?: number, dy?: number) => void;
    setZoomWrapper: (state?: ZoomWrapperState) => void;
}

const defaultZoomProps = {
    maxZoomPixelRatio: 1,
    zoomInMultiplier: 2,
    doubleTapDelay: 300,
    doubleClickDelay: 500,
    doubleClickMaxStops: 2,
    keyboardMoveDistance: 50,
    wheelZoomDistanceFactor: 100,
    pinchZoomDistanceFactor: 100,
    scrollToZoom: false,
};
const resolveZoomProps = (zoom?: Partial<typeof defaultZoomProps>) => ({
    ...defaultZoomProps,
    ...zoom,
});

function useZoomAnimation(zoom: number, offsetX: number, offsetY: number, zoomWrapperRef?: React.RefObject<HTMLDivElement>) {
    const zoomAnimation = React.useRef<Animation | undefined>(undefined);
    const zoomAnimationStart = React.useRef<string | undefined>(undefined);
    const { zoom: zoomAnimationDuration } = useLightboxProps().animation;
    const reduceMotion = useMotionPreference();
    const playZoomAnimation = useEventCallback(() => {
        zoomAnimation.current?.cancel();
        zoomAnimation.current = undefined;
        if (zoomAnimationStart.current && zoomWrapperRef?.current) {
            try {
                zoomAnimation.current = zoomWrapperRef.current.animate?.([
                    { transform: zoomAnimationStart.current },
                    { transform: `scale(${zoom}) translateX(${offsetX}px) translateY(${offsetY}px)` },
                ], {
                    duration: !reduceMotion ? zoomAnimationDuration ?? 500 : 0,
                    easing: zoomAnimation.current ? 'ease-out' : 'ease-in-out',
                });
            } catch (err) {
                console.error(err);
            }
            zoomAnimationStart.current = undefined;
            if (zoomAnimation.current) {
                zoomAnimation.current.onfinish = () => {
                    zoomAnimation.current = undefined;
                };
            }
        }
    });
    useLayoutEffect(playZoomAnimation, [zoom, offsetX, offsetY, playZoomAnimation]);
    return React.useCallback(() => {
        zoomAnimationStart.current = zoomWrapperRef?.current
            ? window.getComputedStyle(zoomWrapperRef.current).transform
            : undefined;
    }, [zoomWrapperRef]);
}

function useZoomCallback(zoom: number, disabled: boolean) {
    const { on } = useLightboxProps();
    const onZoomCallback = useEventCallback(() => {
        if (!disabled) {
            on.zoom?.({ zoom });
        }
    });
    React.useEffect(onZoomCallback, [zoom, onZoomCallback]);
}

function useZoomProps() {
    const { zoom } = useLightboxProps();
    return resolveZoomProps(zoom);
}

function useZoomImageRect(slideRect: ContainerRect, imageDimensions?: ImageDimensions) {
    let imageRect = { width: 0, height: 0 };
    let maxImageRect = { width: 0, height: 0 };
    const { currentSlide } = useLightboxState();
    const { imageFit } = useLightboxProps().carousel;
    const { maxZoomPixelRatio } = useZoomProps();
    if (slideRect && currentSlide) {
        const slide = { ...currentSlide, ...imageDimensions };
        if (isImageSlide(slide)) {
            const cover = isImageFitCover(slide, imageFit);
            const width = Math.max(
                ...(slide.srcSet?.map((x) => x.width) || []).concat(slide.width ? [slide.width] : []),
            );
            const height = Math.max(
                ...(slide.srcSet?.map((x) => x.height) || []).concat(
                    slide.height ? [slide.height] : [],
                ),
            );
            if (width > 0 && height > 0 && slideRect.width > 0 && slideRect.height > 0) {
                maxImageRect = cover
                    ? {
                          width: Math.round(Math.min(width, (slideRect.width / slideRect.height) * height)),
                          height: Math.round(Math.min(height, (slideRect.height / slideRect.width) * width)),
                      }
                    : { width, height };
                maxImageRect = {
                    width: maxImageRect.width * maxZoomPixelRatio,
                    height: maxImageRect.height * maxZoomPixelRatio,
                };
                imageRect = cover
                    ? {
                          width: Math.min(slideRect.width, maxImageRect.width, width),
                          height: Math.min(slideRect.height, maxImageRect.height, height),
                      }
                    : {
                          width: Math.round(Math.min(slideRect.width, (slideRect.height / height) * width, width)),
                          height: Math.round(Math.min(slideRect.height, (slideRect.width / width) * height, height)),
                      };
            }
        }
    }
    const maxZoom = imageRect.width ? Math.max(round(maxImageRect.width / imageRect.width, 5), 1) : 1;
    return { imageRect, maxZoom };
}

function distance(pointerA: PointerState, pointerB: PointerState) {
    return ((pointerA.clientX - pointerB.clientX) ** 2 + (pointerA.clientY - pointerB.clientY) ** 2) ** 0.5;
}
function scaleZoom(value: number, delta: number, factor = 100, clamp = 2) {
    return value * Math.min(1 + Math.abs(delta / factor), clamp) ** Math.sign(delta);
}

function useZoomSensors(
    zoom: number,
    maxZoom: number,
    disabled: boolean,
    changeZoom: (targetZoom: number, rapid?: boolean, dx?: number, dy?: number) => void,
    changeOffsets: (dx?: number, dy?: number, targetZoom?: number) => void,
    zoomWrapper?: React.RefObject<HTMLDivElement>,
) {
    const activePointers = React.useRef<PointerState[]>([]);
    const lastPointerDown = React.useRef(0);
    const pinchZoomDistance = React.useRef<number | undefined>(undefined);
    const { globalIndex } = useLightboxState();
    const { getOwnerWindow } = useDocumentContext();
    const { containerRef, subscribeSensors } = useController();
    const {
        keyboardMoveDistance,
        zoomInMultiplier,
        wheelZoomDistanceFactor,
        scrollToZoom,
        doubleTapDelay,
        doubleClickDelay,
        doubleClickMaxStops,
        pinchZoomDistanceFactor,
    } = useZoomProps();
    const translateCoordinates = React.useCallback(
        (event: { pageX: number; pageY: number }) => {
            if (containerRef.current) {
                const { pageX, pageY } = event;
                const { scrollX, scrollY } = getOwnerWindow();
                const { left, top, width, height } = containerRef.current.getBoundingClientRect();
                return [pageX - left - scrollX - width / 2, pageY - top - scrollY - height / 2];
            }
            return [];
        },
        [containerRef, getOwnerWindow],
    );
    const onKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const { key, metaKey, ctrlKey } = event;
        const meta = metaKey || ctrlKey;
        const preventDefault = () => {
            event.preventDefault();
            event.stopPropagation();
        };
        // Panning is bound to Ctrl+Arrows (plain arrows keep switching slides).
        if (zoom > 1 && event.ctrlKey) {
            const move = (deltaX: number, deltaY: number) => {
                preventDefault();
                changeOffsets(deltaX, deltaY);
            };
            if (key === 'ArrowDown') {
                move(0, keyboardMoveDistance);
            } else if (key === 'ArrowUp') {
                move(0, -keyboardMoveDistance);
            } else if (key === 'ArrowLeft') {
                move(-keyboardMoveDistance, 0);
            } else if (key === 'ArrowRight') {
                move(keyboardMoveDistance, 0);
            }
        }
        const handleChangeZoom = (zoomValue: number) => {
            preventDefault();
            changeZoom(zoomValue);
        };
        if (key === '+' || (meta && key === '=')) {
            handleChangeZoom(zoom * zoomInMultiplier);
        } else if (key === '-' || (meta && key === '_')) {
            handleChangeZoom(zoom / zoomInMultiplier);
        } else if (meta && key === '0') {
            handleChangeZoom(1);
        }
    });
    const onWheel = useEventCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (event.ctrlKey || scrollToZoom) {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.stopPropagation();
                changeZoom(
                    scaleZoom(zoom, -event.deltaY, wheelZoomDistanceFactor),
                    true,
                    ...translateCoordinates(event),
                );
                return;
            }
        }
        if (zoom > 1) {
            event.stopPropagation();
            if (!scrollToZoom) {
                changeOffsets(event.deltaX, event.deltaY);
            }
        }
    });
    const clearPointer = React.useCallback(
        (event: { pointerId: number }) => {
            const pointers = activePointers.current;
            pointers.splice(0, pointers.length, ...pointers.filter((p) => p.pointerId !== event.pointerId));
        },
        [],
    );
    const replacePointer = React.useCallback(
        (event: PointerState) => {
            clearPointer(event);
            activePointers.current.push({
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
            });
        },
        [clearPointer],
    );
    const onPointerDown = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const pointers = activePointers.current;
        if (
            (event.pointerType === 'mouse' && event.buttons > 1) ||
            !zoomWrapper?.current?.contains(event.target as Node)
        ) {
            return;
        }
        if (zoom > 1) {
            event.stopPropagation();
        }
        const { timeStamp } = event;
        if (
            pointers.length === 0 &&
            timeStamp - lastPointerDown.current <
                (event.pointerType === 'touch' ? doubleTapDelay : doubleClickDelay)
        ) {
            lastPointerDown.current = 0;
            changeZoom(
                zoom !== maxZoom
                    ? zoom * Math.max(maxZoom ** (1 / doubleClickMaxStops), zoomInMultiplier)
                    : 1,
                false,
                ...translateCoordinates(event),
            );
        } else {
            lastPointerDown.current = timeStamp;
        }
        replacePointer({
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            pageX: event.pageX,
            pageY: event.pageY,
        });
        if (pointers.length === 2) {
            const [a, b] = pointers;
            pinchZoomDistance.current = distance(a, b);
        }
    });
    const onPointerMove = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const pointers = activePointers.current;
        const activePointer = pointers.find((p) => p.pointerId === event.pointerId);
        if (pointers.length === 2 && pinchZoomDistance.current) {
            event.stopPropagation();
            replacePointer({
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
            });
            const currentDistance = distance(pointers[0], pointers[1]);
            const delta = currentDistance - pinchZoomDistance.current;
            if (Math.abs(delta) !== 0) {
                changeZoom(
                    scaleZoom(zoom, delta, pinchZoomDistanceFactor),
                    true,
                    ...pointers
                        .map((x) => translateCoordinates(x))
                        .reduce((acc: number[], coordinate) => coordinate.map((x, i) => acc[i] + x / 2)),
                );
                pinchZoomDistance.current = currentDistance;
            }
            return;
        }
        if (zoom > 1) {
            event.stopPropagation();
            if (activePointer) {
                if (pointers.length === 1) {
                    changeOffsets(
                        (activePointer.clientX - event.clientX) / zoom,
                        (activePointer.clientY - event.clientY) / zoom,
                    );
                }
                replacePointer({
                    pointerId: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY,
                });
            }
        }
    });
    const onPointerUp = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const pointers = activePointers.current;
        if (pointers.length === 2 && pointers.find((p) => p.pointerId === event.pointerId)) {
            pinchZoomDistance.current = undefined;
        }
        clearPointer(event);
    });
    const cleanupSensors = React.useCallback(() => {
        const pointers = activePointers.current;
        pointers.splice(0, pointers.length);
        lastPointerDown.current = 0;
        pinchZoomDistance.current = undefined;
    }, []);
    useLayoutEffect(() => {
        if (disabled) return () => {};
        return cleanup(
            cleanupSensors,
            subscribeSensors(EVENT_ON_POINTER_DOWN, onPointerDown),
            subscribeSensors(EVENT_ON_POINTER_MOVE, onPointerMove),
            subscribeSensors(EVENT_ON_POINTER_UP, onPointerUp),
            subscribeSensors(EVENT_ON_POINTER_LEAVE, onPointerUp),
            subscribeSensors(EVENT_ON_POINTER_CANCEL, onPointerUp),
        );
    }, [disabled, subscribeSensors, cleanupSensors, onPointerDown, onPointerMove, onPointerUp]);
    React.useEffect(cleanupSensors, [globalIndex, cleanupSensors]);
    React.useEffect(() => {
        if (!disabled) {
            return cleanup(
                cleanupSensors,
                subscribeSensors(EVENT_ON_KEY_DOWN, onKeyDown),
                subscribeSensors(EVENT_ON_WHEEL, onWheel),
            );
        }
        return () => {};
    }, [disabled, subscribeSensors, cleanupSensors, onKeyDown, onWheel]);
}

function useZoomState(imageRect: ContainerRect, maxZoom: number, zoomWrapper?: React.RefObject<HTMLDivElement>) {
    const [zoom, setZoom] = React.useState(1);
    const [offsetX, setOffsetX] = React.useState(0);
    const [offsetY, setOffsetY] = React.useState(0);
    const animate = useZoomAnimation(zoom, offsetX, offsetY, zoomWrapper);
    const { currentSlide, globalIndex } = useLightboxState();
    const { slideRect } = useController();
    const { zoomInMultiplier } = useZoomProps();
    const currentSource = currentSlide && isImageSlide(currentSlide) ? currentSlide.src : undefined;
    const disabled = !currentSource || !zoomWrapper?.current;
    // Persist zoom + camera offset across slides (no reset on navigation). Only
    // clamp the persisted offset to the current slide's bounds once that slide's
    // image rect is known, so a smaller image does not show empty space.
    useLayoutEffect(() => {
        if (zoom <= 1 || imageRect.width === 0 || imageRect.height === 0) return;
        const maxOffsetX = Math.max(0, (imageRect.width * zoom - slideRect.width) / 2 / zoom);
        const maxOffsetY = Math.max(0, (imageRect.height * zoom - slideRect.height) / 2 / zoom);
        setOffsetX(Math.min(Math.abs(offsetX), maxOffsetX) * Math.sign(offsetX));
        setOffsetY(Math.min(Math.abs(offsetY), maxOffsetY) * Math.sign(offsetY));
    }, [globalIndex, zoom, imageRect.width, imageRect.height, slideRect.width, slideRect.height, offsetX, offsetY]);
    const changeOffsets = React.useCallback(
        (dx?: number, dy?: number, targetZoom?: number) => {
            const newZoom = targetZoom || zoom;
            const newOffsetX = offsetX - (dx || 0);
            const newOffsetY = offsetY - (dy || 0);
            const maxOffsetX = (imageRect.width * newZoom - slideRect.width) / 2 / newZoom;
            const maxOffsetY = (imageRect.height * newZoom - slideRect.height) / 2 / newZoom;
            setOffsetX(Math.min(Math.abs(newOffsetX), Math.max(maxOffsetX, 0)) * Math.sign(newOffsetX));
            setOffsetY(Math.min(Math.abs(newOffsetY), Math.max(maxOffsetY, 0)) * Math.sign(newOffsetY));
        },
        [zoom, offsetX, offsetY, slideRect, imageRect.width, imageRect.height],
    );
    const changeZoom = React.useCallback(
        (targetZoom: number, rapid?: boolean, dx?: number, dy?: number) => {
            const newZoom = round(Math.min(Math.max(targetZoom + 0.001 < maxZoom ? targetZoom : maxZoom, 1), maxZoom), 5);
            if (newZoom === zoom) return;
            if (!rapid) {
                animate();
            }
            changeOffsets(
                dx ? dx * (1 / zoom - 1 / newZoom) : 0,
                dy ? dy * (1 / zoom - 1 / newZoom) : 0,
                newZoom,
            );
            setZoom(newZoom);
        },
        [zoom, maxZoom, changeOffsets, animate],
    );
    const handleControllerRectChange = useEventCallback(() => {
        if (zoom > 1) {
            if (zoom > maxZoom) {
                changeZoom(maxZoom, true);
            }
            changeOffsets();
        }
    });
    useLayoutEffect(handleControllerRectChange, [
        slideRect.width,
        slideRect.height,
        handleControllerRectChange,
    ]);
    const zoomIn = React.useCallback(() => changeZoom(zoom * zoomInMultiplier), [zoom, zoomInMultiplier, changeZoom]);
    const zoomOut = React.useCallback(() => changeZoom(zoom / zoomInMultiplier), [zoom, zoomInMultiplier, changeZoom]);
    return { zoom, offsetX, offsetY, disabled, changeOffsets, changeZoom, zoomIn, zoomOut };
}

const ZoomControllerContext = React.createContext<ZoomContextValue | null>(null);
const useZoom = makeUseContext<ZoomContextValue>('useZoom', 'ZoomControllerContext', ZoomControllerContext);

function ZoomContextProvider({ children }: { children?: React.ReactNode }) {
    const [zoomWrapper, setZoomWrapper] = React.useState<ZoomWrapperState>();
    const { slideRect } = useController();
    const { imageRect, maxZoom } = useZoomImageRect(slideRect, zoomWrapper?.imageDimensions);
    const { zoom, offsetX, offsetY, disabled, changeZoom, changeOffsets, zoomIn, zoomOut } = useZoomState(
        imageRect,
        maxZoom,
        zoomWrapper?.zoomWrapperRef,
    );
    useZoomCallback(zoom, disabled);
    useZoomSensors(zoom, maxZoom, disabled, changeZoom, changeOffsets, zoomWrapper?.zoomWrapperRef);
    const zoomRef = React.useMemo(
        () => ({ zoom, maxZoom, offsetX, offsetY, disabled, zoomIn, zoomOut, changeZoom }),
        [zoom, maxZoom, offsetX, offsetY, disabled, zoomIn, zoomOut, changeZoom],
    );
    const context = React.useMemo(
        () => ({ ...zoomRef, setZoomWrapper }),
        [zoomRef, setZoomWrapper],
    );
    return <ZoomControllerContext.Provider value={context}>{children}</ZoomControllerContext.Provider>;
}

const ZoomInIcon = createIcon(
    'ZoomIn',
    <React.Fragment>
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z" />
    </React.Fragment>,
);
const ZoomOutIcon = createIcon(
    'ZoomOut',
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z" />,
);

const ZoomButton = React.forwardRef<HTMLButtonElement, { zoomIn?: boolean; onLoseFocus: () => void }>(
    ({ zoomIn, onLoseFocus }, ref) => {
        const wasEnabled = React.useRef(false);
        const wasFocused = React.useRef(false);
        const { zoom, maxZoom, zoomIn: zoomInCallback, zoomOut: zoomOutCallback, disabled: zoomDisabled } =
            useZoom();
        const { render } = useLightboxProps();
        const disabled = zoomDisabled || (zoomIn ? zoom >= maxZoom : zoom <= 1);
        React.useEffect(() => {
            if (disabled && wasEnabled.current && wasFocused.current) {
                onLoseFocus();
            }
            if (!disabled) {
                wasEnabled.current = true;
            }
        }, [disabled, onLoseFocus]);
        return (
            <IconButton
                ref={ref}
                disabled={disabled}
                label={zoomIn ? 'Zoom in' : 'Zoom out'}
                icon={zoomIn ? ZoomInIcon : ZoomOutIcon}
                renderIcon={zoomIn ? render.iconZoomIn : render.iconZoomOut}
                onClick={zoomIn ? zoomInCallback : zoomOutCallback}
                onFocus={() => {
                    wasFocused.current = true;
                }}
                onBlur={() => {
                    wasFocused.current = false;
                }}
            />
        );
    },
);

function ZoomButtonsGroup() {
    const zoomInRef = React.useRef<HTMLButtonElement>(null);
    const zoomOutRef = React.useRef<HTMLButtonElement>(null);
    const { focus } = useController();
    const focusSibling = React.useCallback(
        (sibling: React.RefObject<HTMLButtonElement>) => {
            if (sibling.current && !sibling.current.disabled) {
                sibling.current.focus();
            } else {
                focus();
            }
        },
        [focus],
    );
    const focusZoomIn = React.useCallback(() => focusSibling(zoomInRef), [focusSibling]);
    const focusZoomOut = React.useCallback(() => focusSibling(zoomOutRef), [focusSibling]);
    return (
        <React.Fragment>
            <ZoomButton zoomIn ref={zoomInRef} onLoseFocus={focusZoomOut} />
            <ZoomButton ref={zoomOutRef} onLoseFocus={focusZoomIn} />
        </React.Fragment>
    );
}

function ZoomToolbarControl() {
    const { render } = useLightboxProps();
    const zoomRef = useZoom();
    if (render.buttonZoom) {
        return render.buttonZoom(zoomRef);
    }
    return <ZoomButtonsGroup />;
}

function ZoomWrapper(props: RenderSlideProps & { render: Render }) {
    const { render, slide, offset, rect } = props;
    const [imageDimensions, setImageDimensions] = React.useState<ImageDimensions>();
    const zoomWrapperRef = React.useRef<HTMLDivElement>(null);
    const { zoom, offsetX, offsetY, setZoomWrapper } = useZoom();
    const interactive = zoom > 1;
    const { carousel, on } = useLightboxProps();
    const { currentIndex } = useLightboxState();
    useLayoutEffect(() => {
        if (offset === 0) {
            setZoomWrapper({ zoomWrapperRef, imageDimensions });
            return () => setZoomWrapper(undefined);
        }
        return () => {};
    }, [offset, imageDimensions, setZoomWrapper]);
    let rendered = render.slide?.({ slide, offset, rect });
    if (!rendered && isImageSlide(slide)) {
        rendered = (
            <ImageSlide
                slide={slide}
                offset={offset}
                rect={rect}
                render={render}
                imageFit={carousel.imageFit}
                imageProps={carousel.imageProps}
                onClick={offset === 0 ? () => on.click?.({ index: currentIndex }) : undefined}
                onLoad={(img) => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })}
            />
        );
    }
    if (!rendered) return null;
    return (
        <div
            ref={zoomWrapperRef}
            className={clsx(
                cssClass(CLASS_FULLSIZE),
                cssClass(CLASS_FLEX_CENTER),
                cssClass(CLASS_SLIDE_WRAPPER),
                interactive && cssClass(CLASS_SLIDE_WRAPPER_INTERACTIVE),
            )}
            style={offset === 0 ? { transform: `scale(${zoom}) translateX(${offsetX}px) translateY(${offsetY}px)` } : undefined}
        >
            {rendered}
        </div>
    );
}

export const StickyZoom: Plugin = ({ augment, addModule }) => {
    augment(({ zoom: zoomProps, toolbar, render, controller, ...restProps }) => {
        const zoom = resolveZoomProps(zoomProps);
        return {
            zoom,
            toolbar: addToolbarButton(toolbar, PLUGIN_ZOOM, <ZoomToolbarControl />),
            render: {
                ...render,
                slide: (props) => {
                    return isImageSlide(props.slide) ? (
                        <ZoomWrapper render={render} {...props} />
                    ) : (
                        render.slide?.(props)
                    );
                },
            },
            controller: { ...controller, preventDefaultWheelY: zoom.scrollToZoom },
            ...restProps,
        };
    });
    addModule(createModule(PLUGIN_ZOOM, ZoomContextProvider));
};

export default StickyZoom;
