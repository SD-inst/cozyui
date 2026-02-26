import { useEffect, useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useActiveTab } from '../../hooks/useActiveTab';
import { useBooleanSetting } from '../../hooks/useSetting';
import { useAppSelector } from '../../redux/hooks';
import { statusEnum } from '../../redux/progress';
import { useTabName } from '../contexts/TabContext';

export const ImagePreview = ({ size }: { size: number }) => {
    const tab_name = useTabName();
    const enabled = useBooleanSetting(settings.enable_previews);
    const status = useAppSelector((s) => s.progress.status);
    const ref = useRef<HTMLCanvasElement>(null);
    const { frames } = useAppSelector((s) => s.preview);
    const isActiveTab = useActiveTab();
    const active = isActiveTab && enabled && status === statusEnum.RUNNING;
    useEffect(() => {
        if (!ref.current) {
            return;
        }
        const ctx = ref.current.getContext('2d');
        if (!ctx) {
            console.log("Couldn't get canvas context");
            return;
        }
        if (!active || !frames.length || !frames[0]) {
            ctx.clearRect(0, 0, ref.current.width, ref.current.height);
            ref.current.width = size;
            ref.current.height = size;
            return;
        }
        const image_aspect = frames[0].width / frames[0].height;
        const tiles_x_f = Math.max(
            Math.min(
                frames.length,
                Math.floor(Math.sqrt(frames.length / image_aspect)),
            ),
            1,
        );
        const tiles_y_f = Math.ceil(frames.length / tiles_x_f);

        const tiles_x_c = Math.max(
            Math.min(
                frames.length,
                Math.ceil(Math.sqrt(frames.length / image_aspect)),
            ),
            1,
        );
        const tiles_y_c = Math.ceil(frames.length / tiles_x_c);

        const tiles_x =
            Math.abs(Math.SQRT2 - (tiles_x_f * image_aspect) / tiles_y_f) <
            Math.abs(Math.SQRT2 - (tiles_x_c * image_aspect) / tiles_y_c)
                ? tiles_x_f
                : tiles_x_c;

        const tiles_y = Math.ceil(frames.length / tiles_x);
        const sx = size / tiles_x;
        const sy = (sx / frames[0].width) * frames[0].height;
        ref.current.width = size;
        ref.current.height = sy * tiles_y;
        for (let y = 0; y < tiles_y; y++) {
            for (let x = 0; x < tiles_x; x++) {
                const idx = y * tiles_x + x;
                if (idx >= frames.length) {
                    break;
                }
                const frame = frames[idx];
                if (!frame) {
                    continue;
                }
                const cx = x * sx;
                const cy = y * sy;
                ctx.drawImage(frame, cx, cy, sx, sy);
            }
        }
    }, [active, frames, size]);

    return (
        <canvas
            ref={ref}
            data-preview='true'
            data-tab={tab_name}
            style={{
                display: active ? 'block' : 'none',
            }}
        />
    );
};
