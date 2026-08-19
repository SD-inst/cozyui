import { useEffect, useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useActiveTab } from '../../hooks/useActiveTab';
import { useBooleanSetting } from '../../hooks/useSetting';
import { useAppSelector } from '../../redux/hooks';
import { statusEnum } from '../../redux/progress';
import { useTabName } from '../contexts/TabContext';

// pointer travel (px) below this is treated as a click, above it as a drag
const SCRUB_THRESHOLD = 5;

export const VideoPreview = ({
    size,
    rate_override,
    fps = 24,
}: {
    size: number;
    rate_override?: number;
    fps?: number;
}) => {
    const tab_name = useTabName();
    const enabled = useBooleanSetting(settings.enable_previews);
    const status = useAppSelector((s) => s.progress.status);
    const ref = useRef<HTMLCanvasElement>(null);
    const idxRef = useRef(0);
    const frameRef = useRef<ImageBitmap[]>([]);
    const scrubRef = useRef({
        scrubbing: false,
        pointerId: -1,
        startX: 0,
        startIdx: 0,
        width: 0,
        committed: false,
    });
    const { frames, rate } = useAppSelector((s) => s.preview);
    const isActiveTab = useActiveTab();
    // don't use state directly to avoid preview restarts
    // instead, copy the updated frames to a ref
    useEffect(() => {
        frameRef.current = frames;
    }, [frames]);
    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = e.currentTarget;
        if (e.pointerType === 'mouse' && e.button !== 0) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        scrubRef.current = {
            scrubbing: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startIdx: idxRef.current,
            width: rect.width || size,
            committed: false,
        };
        canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const s = scrubRef.current;
        if (!s.scrubbing || s.pointerId !== e.pointerId) {
            return;
        }
        const frames = frameRef.current;
        if (!frames.length) {
            return;
        }
        const dx = e.clientX - s.startX;
        if (!s.committed && Math.abs(dx) < SCRUB_THRESHOLD) {
            return;
        }
        s.committed = true;
        const dIdx = (dx / s.width) * frames.length;
        const newIdx = Math.floor(s.startIdx + dIdx);
        idxRef.current = ((newIdx % frames.length) + frames.length) % frames.length;
    };
    const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const s = scrubRef.current;
        if (!s.scrubbing || s.pointerId !== e.pointerId) {
            return;
        }
        const canvas = e.currentTarget;
        // plain click (no drag) resets the preview to the beginning
        if (!s.committed) {
            idxRef.current = 0;
        }
        s.scrubbing = false;
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };
    useEffect(() => {
        if (!ref.current) {
            return;
        }
        ref.current.width = size;
        ref.current.height = size;
        const ctx = ref.current.getContext('2d');
        if (!ctx) {
            console.log("Can't get ctx");
            return;
        }
        if (!rate) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        const effective_rate = rate_override || rate;
        idxRef.current = 0;
        const interval = setInterval(
            () => {
                // read the latest frames from the ref so the animation never breaks
                const frames = frameRef.current;
                if (!frames.length) {
                    return;
                }
                const idx = idxRef.current % frames.length;
                const fn = `${idx * effective_rate}/${frames.length * effective_rate}`;
                // while scrubbing the pointer owns the index — don't auto-advance
                if (!scrubRef.current.scrubbing) {
                    idxRef.current = (idx + 1) % frames.length;
                }
                const img = frames[idx];
                if (!img) {
                    return;
                }
                const aspect = img.width / img.height;
                let fontSize = img.width / 20;
                if (aspect > 1) {
                    ctx.canvas.width = size;
                    ctx.canvas.height = size / aspect;
                    ctx.scale(size / img.width, size / img.width);
                    ctx.lineWidth = img.width / size / 4;
                } else {
                    ctx.canvas.height = size;
                    ctx.canvas.width = size * aspect;
                    ctx.scale(size / img.height, size / img.height);
                    fontSize = img.height / 20;
                    ctx.lineWidth = img.height / size / 4;
                }
                ctx.drawImage(img, 0, 0);
                if (frames.length === 1) {
                    // don't draw frame number for image preview
                    return;
                }
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = '#ccc';
                ctx.strokeStyle = '#000';
                const top = img.height / 10;
                const left = 2;
                ctx.fillText(fn, left, top);
                ctx.strokeText(fn, left, top);
            },
            (1000 * effective_rate) / fps,
        );
        return () => {
            clearInterval(interval);
        };
    }, [fps, rate, rate_override, size]);
    return (
        <canvas
            ref={ref}
            data-preview='true'
            data-tab={tab_name}
            style={{
                display:
                    isActiveTab && enabled && status === statusEnum.RUNNING
                        ? 'block'
                        : 'none',
                touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
        />
    );
};
