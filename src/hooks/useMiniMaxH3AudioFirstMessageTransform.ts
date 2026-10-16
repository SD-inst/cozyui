import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import {
    formatRefModsLine,
    useRefModsForChat,
} from './useRefMods';

/**
 * First-message transform for the audio-only H3 tab: same as the R2V one but
 * without the aspect-ratio line — the video stream is a fixed 32x32
 * placeholder there, so the aspect is meaningless to the prompt.
 */
export const useMiniMaxH3AudioFirstMessageTransform = () => {
    const length = useWatch({ name: 'length', defaultValue: 10 });
    // Ref mods are attached first, so their image positions are 1-based from
    // their own index (no offset).
    const refMods = useRefModsForChat('refmods');

    return useCallback(
        (text: string) => {
            const lines: string[] = [];
            lines.push(`length=${length}`);
            if (refMods.length) {
                lines.push(`refmods=${formatRefModsLine(refMods)}`);
            }
            lines.push(`description=${text}`);
            return lines.join('\n');
        },
        [length, refMods],
    );
};
