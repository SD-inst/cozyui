import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { useTabName } from '../contexts/TabContext';
import { useBooleanSetting } from '../../hooks/useBooleanSetting';
import { settings } from '../../hooks/settings';
import { statusEnum } from '../../redux/progress';

export const VideoPreview = ({ size }: { size: number }) => {
    const enabled = useBooleanSetting(settings.enable_previews);
    const status = useAppSelector((s) => s.progress.status);
    const ref = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<ImageBitmap[]>([]);
    const { frames, rate } = useAppSelector((s) => s.preview);
    const prompt = useAppSelector((s) => s.tab.prompt);
    const active_tabs = Object.entries(prompt).map(
        ([, { tab_name }]) => tab_name
    );
    const tab_name = useTabName();
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
    }, [size]);
    // don't use state directly to avoid preview restarts
    // instead, copy the updated frames to a ref
    useEffect(() => {
        frameRef.current = frames;
    }, [frames]);
    useEffect(() => {
        const ctx = ref.current?.getContext('2d');
        if (!ctx) {
            return;
        }
        if (!rate) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }
        let idx = 0;
        let frames: ImageBitmap[] = [];
        const interval = setInterval(() => {
            // before rendering the first preview frame
            // update the frames from the ref so that animation never breaks
            if (!idx) {
                frames = frameRef.current;
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
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.drawImage(img, 0, 0);
            ctx.fillStyle = '#ccc';
            ctx.strokeStyle = '#000';
            const fn = '' + (idx * 24) / rate;
            const top = img.height / 10;
            const left = 2;
            ctx.fillText(fn, left, top);
            ctx.strokeText(fn, left, top);
            idx = (idx + 1) % frames.length;
        }, 1000 / rate);
        return () => {
            clearInterval(interval);
        };
    }, [rate, size]);
    if (!enabled || status !== statusEnum.RUNNING) {
        return null;
    }
    return (
        <canvas
            ref={ref}
            style={{
                display: active_tabs.includes(tab_name) ? 'block' : 'none',
            }}
        />
    );
};
