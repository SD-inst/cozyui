import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import {
    applyAudioRefine,
    TValue,
} from './MiniMaxH3AudioRefinerHandler';
import { SchedulerSelectInput } from './SchedulerSelectInput';
import { SamplerSelectInput } from './SamplerSelectInput';
import { SeedInput } from './SeedInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

const defaultValue: TValue = {
    enabled: false,
    steps: 6,
    audio_denoise: 0.5,
    sampler: 'seeds_2',
    scheduler: 'sgm_uniform',
    seed: 1024,
};

export const MiniMaxH3AudioRefiner = ({
    name = 'audio_refine',
    ...props
}: { name?: string } & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const handler = useEventCallback(
        (api: Workflow, value: TValue, control: controlType) => {
            applyAudioRefine(api, value, control);
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <Box {...props}>
            <ToggleInput
                name={`${name}.enabled`}
                label='audio_refine'
                defaultValue={defaultValue.enabled}
            />
            {value?.enabled && (
                <Box display='flex' flexDirection='column' gap={2}>
                    <SliderInput
                        name={`${name}.steps`}
                        label='audio_refine_steps'
                        defaultValue={defaultValue.steps}
                        min={1}
                        max={20}
                        step={1}
                    />
                    <SliderInput
                        name={`${name}.audio_denoise`}
                        label='audio_refine_denoise'
                        defaultValue={defaultValue.audio_denoise}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                    <SamplerSelectInput
                        name={`${name}.sampler`}
                        label='audio_refine_sampler'
                        defaultValue={defaultValue.sampler}
                    />
                    <SchedulerSelectInput
                        name={`${name}.scheduler`}
                        label='audio_refine_scheduler'
                        defaultValue={defaultValue.scheduler}
                    />
                    <SeedInput
                        name={`${name}.seed`}
                        label='audio_refine_seed'
                        defaultValue={defaultValue.seed}
                    />
                </Box>
            )}
        </Box>
    );
};
