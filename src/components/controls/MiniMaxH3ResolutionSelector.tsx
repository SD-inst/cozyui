import { SxProps } from '@mui/material';
import { SelectInput } from './SelectInput';
import { ASPECT_LABELS } from '../../utils/aspect';

/**
 * The aspect list of the H3 tabs. `label` names the translation key under
 * `controls.` — the input controls derive it from `name`, which is a nested
 * path (`custom_aspect.aspect_ratio`) when the list belongs to a compound
 * control, and no such key exists for those.
 */
export const MiniMaxH3ResolutionSelector = ({
    name,
    defaultValue,
    label,
    sx,
}: {
    name: string;
    defaultValue: string;
    label?: string;
    sx?: SxProps;
}) => {
    return (
        <SelectInput
            name={name}
            defaultValue={defaultValue}
            label={label}
            choices={ASPECT_LABELS}
            sx={sx}
        />
    );
};
