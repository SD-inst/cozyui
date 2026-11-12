import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';

/**
 * Labels the pictures the first chat message of the H3 Image Edit tab carries.
 * `ChatComponent` attaches the rows of the image list in form order, dropping
 * the ones flagged `skip_chat` and the empty ones, and the model is told about
 * them as `<Picture 1>`, `<Picture 2>`, … — so the numbering is computed here
 * the same way, with the first row (the picture being edited) named apart from
 * the references that follow it.
 *
 * A canvas picked with the custom-aspect toggle is stated as well: with one, the
 * edited picture no longer decides the shape the description is composed for.
 */
export const useMiniMaxH3ImageEditFirstMessageTransform = (
    imagesName = 'images',
    customAspectName = 'custom_aspect',
) => {
    const images = useWatch({ name: imagesName });
    const customAspect = useWatch({ name: customAspectName });

    return useCallback(
        (text: string) => {
            const pictures = (images ?? [])
                .filter((entry: any) => !!entry?.image && !entry?.skip_chat)
                .map((_: any, idx: number) => `Picture ${idx + 1}`);
            const lines: string[] = [];
            if (pictures.length) {
                lines.push(`edited_image=${pictures[0]}`);
            }
            if (pictures.length > 1) {
                lines.push(`reference_images=${pictures.slice(1).join(', ')}`);
            }
            // The selector holds a label such as "16:9 (Wide)"; the canvas is
            // the bare ratio in front of it.
            if (customAspect?.enabled && customAspect?.aspect_ratio) {
                lines.push(
                    `aspect=${String(customAspect.aspect_ratio).split(' ')[0]}`,
                );
            }
            lines.push(`description=${text}`);
            return lines.join('\n');
        },
        [images, customAspect],
    );
};
