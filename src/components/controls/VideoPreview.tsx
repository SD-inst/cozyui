import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { useTabName } from '../contexts/TabContext';
import { useBooleanSetting } from '../../hooks/useBooleanSetting';
import { settings } from '../../hooks/settings';

export const VideoPreview = ({ size }: { size: number }) => {
    const enabled = useBooleanSetting(settings.enable_previews);
    const ref = useRef<HTMLCanvasElement>(null);
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
            console.log('Cant get ctx');
            return;
        }
    }, [size]);
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
        const interval = setInterval(() => {
            const img = frames[idx];
            if (!img) {
                return;
            }
            const aspect = img.width / img.height;
            if (aspect > 1) {
                ctx.canvas.width = size;
                ctx.canvas.height = size / aspect;
                ctx.scale(size / img.width, size / img.width);
            } else {
                ctx.canvas.height = size;
                ctx.canvas.width = size * aspect;
                ctx.scale(size / img.height, size / img.height);
            }
            ctx.drawImage(img, 0, 0);
            idx = (idx + 1) % frames.length;
        }, 1000 / rate);
        return () => {
            clearInterval(interval);
        };
    }, [frames, rate, size]);
    if (!enabled) {
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
