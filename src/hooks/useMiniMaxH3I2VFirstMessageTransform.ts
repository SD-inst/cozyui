import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';

export const useMiniMaxH3I2VFirstMessageTransform = () => {
    const length = useWatch({ name: 'length', defaultValue: 5 });
    const aspectRatio = useWatch({
        name: 'aspect_ratio',
        defaultValue: '16:9 (Widescreen)',
    });
    const aspect = aspectRatio.split(' ')[0];
    const firstFrame = useWatch({ name: 'first_frame' });
    const lastFrame = useWatch({ name: 'last_frame' });

    return useCallback(
        (text: string) => {
            const lines = [`length=${length}`, `aspect=${aspect}`];
            let picture = 0;
            if (firstFrame) {
                lines.push(`first_image=Picture ${++picture}`);
            }
            if (lastFrame) {
                lines.push(`last_image=Picture ${++picture}`);
            }
            lines.push(`description=${text}`);
            return lines.join('\n');
        },
        [length, aspect, firstFrame, lastFrame],
    );
};
