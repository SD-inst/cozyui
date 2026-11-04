import { useEventCallback } from '@mui/material';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ArrayInput } from './ArrayInput';
import { FileUpload } from './FileUpload';
import { applyPH3Images, PH3ImageEntry } from './PH3ImagesHandler';

// Kept at module level: ArrayInput holds `newValue` in an effect's deps, so a
// fresh literal on every render re-runs that effect. It is cloned per slot.
const newValue = {};

/**
 * The images of the P-H3 image edit tab in one list: the first row is the
 * image being edited, the rows after it are references (see
 * `applyPH3Images`). One list because the order is the picture numbering the
 * prompt talks about — splitting it across two controls would hide that order.
 *
 * The list starts and resets empty: an empty row cannot be generated from, and
 * a forced empty slot only puts a broken thumbnail on the screen. That one
 * image is required is the tab's business — its Generate button stays locked
 * until a row carries a file.
 */
export const PH3Images = ({
    name = 'images',
    max = 9,
}: {
    name?: string;
    max?: number;
}) => {
    const handler = useEventCallback(
        (api: Workflow, value: PH3ImageEntry[], control: controlType) => {
            applyPH3Images(api, value, control);
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
            hideChatToggle
        >
            <FileUpload name='image' label='image' />
        </ArrayInput>
    );
};
