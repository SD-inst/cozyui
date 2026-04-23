import { useEffect, useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useActiveTab } from '../../hooks/useActiveTab';
import { useBooleanSetting } from '../../hooks/useSetting';
import { useAppSelector } from '../../redux/hooks';
import { statusEnum } from '../../redux/progress';
import { useTabName } from '../contexts/TabContext';

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
    const { frames, rate } = useAppSelector((s) => s.preview);
    const isActiveTab = useActiveTab();
    // don't use state directly to avoid preview restarts
    // instead, copy the updated frames to a ref
    useEffect(() => {
        frameRef.current = frames;
    }, [frames]);
    useEffect(() => {
        const canvas = ref.current;
        const handleClick = () => {
            idxRef.current = 0;
        };
        canvas?.addEventListener('click', handleClick);
        return () => canvas?.removeEventListener('click', handleClick);
    }, []);
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
        let frames: ImageBitmap[] = [];
        const effective_rate = rate_override || rate;
        idxRef.current = 0;
        const interval = setInterval(
            () => {
                let idx = idxRef.current;
                const fn = `${idx * effective_rate}/${frames.length * effective_rate}`;
                // before rendering the first preview frame
                // update the frames from the ref so that animation never breaks
                if (!idx) {
                    frames = frameRef.current;
                }
                const img = frames[idx];
                idx = (idx + 1) % frames.length;
                idxRef.current = idx;
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
            frames = [];
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
            }}
        />
    );
};
