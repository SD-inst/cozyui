import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import {
    H3ICustomAspectValue,
    applyH3ICustomAspect,
    defaultH3ICanvasAspect,
} from './H3ICustomAspectHandler';
import { MiniMaxH3ResolutionSelector } from './MiniMaxH3ResolutionSelector';
import { ToggleInput } from './ToggleInput';

const defaultValue: H3ICustomAspectValue = {
    enabled: false,
    aspect_ratio: defaultH3ICanvasAspect,
};

/**
 * A canvas of the H3 Image edit run picked by hand instead of the one the
 * edited picture implies: the toggle adds a `ResolutionSelector` to the run
 * (see `applyH3ICustomAspect`), and while it is on the aspect list is shown —
 * the megapixel slider the tab already holds is the other half of that node.
 */
export const H3ICustomAspect = ({
    name = 'custom_aspect',
    megapixelsName = 'megapixels',
    ...props
}: {
    name?: string;
    megapixelsName?: string;
} & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: Workflow, value: H3ICustomAspectValue, control: controlType) => {
            applyH3ICustomAspect(api, value, control, getValues(megapixelsName));
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <Box {...props}>
            <ToggleInput
                name={`${name}.enabled`}
                label='custom_aspect'
                defaultValue={defaultValue.enabled}
            />
            {value?.enabled && (
                <MiniMaxH3ResolutionSelector
                    name={`${name}.aspect_ratio`}
                    label='aspect_ratio'
                    defaultValue={defaultH3ICanvasAspect}
                    // the select only carries a bottom margin, so without this
                    // its floating label would sit on top of the switch
                    sx={{ mt: 2 }}
                />
            )}
        </Box>
    );
};
