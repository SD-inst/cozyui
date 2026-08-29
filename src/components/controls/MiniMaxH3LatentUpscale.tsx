import { useEffect } from 'react';
import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { NodeRef, Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SamplerSelectInput } from './SamplerSelectInput';
import { SeedInput } from './SeedInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import {
    applyLatentUpscale,
    TValue,
} from './MiniMaxH3LatentUpscaleHandler';

const defaultValue: TValue = {
    enabled: false,
    main_steps: 4,
    megapixels: 1,
    sampler: 'er_sde',
    seed: 1024,
    steps: 3,
};

export const MiniMaxH3LatentUpscale = ({
    name = 'latent_upscale',
    ...props
}: { name?: string } & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const mainSteps = useWatch({ name: 'steps', defaultValue: 8 }) as number;
    const pdd = useWatch({ name: 'pdd', defaultValue: false }) as boolean;
    const { getValues, setValue } = useFormContext();
    // The main-pass step count defaults to the base step count (the slider's
    // maximum) and follows the `steps` control whenever it changes.
    useEffect(() => {
        setValue(`${name}.main_steps`, mainSteps);
    }, [mainSteps, name, setValue]);
    const handler = useEventCallback(
        (api: Workflow, value: TValue, control: controlType) => {
        applyLatentUpscale(api, value, control, {
            refImages: getValues('ref_images'),
            refVideos: getValues('ref_videos'),
            firstFrame: getValues('first_frame'),
            lastFrame: getValues('last_frame'),
            aspectRatio: getValues('aspect_ratio'),
            baseMP: getValues('megapixels'),
            targetMP: value.megapixels,
            // PDD variant 2: run the upscale pass on the model before the PDD
            // node (the PDD LoRAs are only valid on the base pass).
            pddModelRef:
                getValues('pdd') && control.sigma_shift_node_id
                    ? ([control.sigma_shift_node_id, 0] as NodeRef)
                    : undefined,
        });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <Box {...props}>
            <ToggleInput
                name={`${name}.enabled`}
                label='latent_upscale'
                defaultValue={defaultValue.enabled}
            />
            {value?.enabled && (
                <Box display='flex' flexDirection='column' gap={2}>
                    {/* The main-pass step count is ignored under PDD (the PDD
                        schedule is a fixed nfe that is not split), so the
                        slider is hidden. */}
                    {!pdd && (
                        <SliderInput
                            name={`${name}.main_steps`}
                            label='latent_upscale_main_steps'
                            defaultValue={mainSteps}
                            min={1}
                            max={Math.max(1, mainSteps)}
                            step={1}
                        />
                    )}
                    <SliderInput
                        name={`${name}.megapixels`}
                        label='latent_upscale_megapixels'
                        defaultValue={defaultValue.megapixels}
                        min={0.1}
                        max={2}
                        step={0.1}
                    />
                    <SliderInput
                        name={`${name}.steps`}
                        label='latent_upscale_steps'
                        defaultValue={defaultValue.steps}
                        min={3}
                        max={5}
                        step={1}
                    />
                    <SamplerSelectInput
                        name={`${name}.sampler`}
                        label='latent_upscale_sampler'
                        defaultValue={defaultValue.sampler}
                    />
                    <SeedInput
                        name={`${name}.seed`}
                        label='latent_upscale_seed'
                        defaultValue={defaultValue.seed}
                    />
                </Box>
            )}
        </Box>
    );
};
