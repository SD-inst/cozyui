import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import {
    formatRefModsLine,
    useRefModsForChat,
} from './useRefMods';

export const useMiniMaxH3FirstMessageTransform = () => {
    const length = useWatch({ name: 'length', defaultValue: 5 });
    const aspectRatio = useWatch({
        name: 'aspect_ratio',
        defaultValue: '16:9 (Widescreen)',
    });
    const aspect = aspectRatio.split(' ')[0];
    // Ref mods are attached first, so their image positions are 1-based from
    // their own index (no offset).
    const refMods = useRefModsForChat('refmods');

    return useCallback(
        (text: string) => {
            const lines: string[] = [];
            if (length !== 0) {
                lines.push(`length=${length}`);
            }
            lines.push(`aspect=${aspect}`);
            if (refMods.length) {
                lines.push(`refmods=${formatRefModsLine(refMods)}`);
            }
            lines.push(`description=${text}`);
            return lines.join('\n');
        },
        [length, aspect, refMods],
    );
};
