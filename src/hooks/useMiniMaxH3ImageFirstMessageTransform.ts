import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';

/**
 * Prefixes the first chat message of the H3 Image tab with the canvas the
 * image will be rendered on, so the caption the assistant writes is composed
 * for it. The resolution selector stores a label like `1:1 (Square)`; only the
 * bare ratio is useful to the model.
 */
export const useMiniMaxH3ImageFirstMessageTransform = () => {
    const aspectRatio = useWatch({
        name: 'aspect_ratio',
        defaultValue: '1:1 (Square)',
    });
    const aspect = aspectRatio.split(' ')[0];

    return useCallback(
        (text: string) => `aspect=${aspect}\ndescription=${text}`,
        [aspect],
    );
};
