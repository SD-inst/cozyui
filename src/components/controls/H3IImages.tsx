import { useEventCallback } from '@mui/material';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ArrayInput } from './ArrayInput';
import { FileUpload } from './FileUpload';
import { applyH3IImages, H3IImageEntry } from './H3IImagesHandler';

// Kept at module level: ArrayInput holds `newValue` in an effect's deps, so a
// fresh literal on every render re-runs that effect. It is cloned per slot.
const newValue = {};

/**
 * The images of the H3 Image edit tab in one list: the first row is the image
 * being edited, the rows after it are references (see `applyH3IImages`). One
 * list because the order is the `<Picture N>` numbering both the chat and the
 * conditioning read — splitting it across two controls would hide it.
 *
 * The list starts and resets empty: an empty row cannot be generated from, and a
 * forced empty slot only puts a broken thumbnail on the screen. That one image
 * is required is the tab's business — its Generate button stays locked until a
 * row carries a file. Sixteen rows is what the model's reference path takes.
 */
export const H3IImages = ({
    name = 'images',
    max = 16,
}: {
    name?: string;
    max?: number;
}) => {
    const handler = useEventCallback(
        (api: Workflow, value: H3IImageEntry[], control: controlType) => {
            applyH3IImages(api, value, control);
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            // unlike the input controls, ArrayInput is given the full
            // translation key rather than a name under `controls.`
            label='controls.edit_images'
            newValue={newValue}
            max={max}
            receiverFieldName='image'
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' />
        </ArrayInput>
    );
};
