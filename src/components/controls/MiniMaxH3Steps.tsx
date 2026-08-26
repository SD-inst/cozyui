import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { SliderInput } from './SliderInput';

const PDD_STEPS = [8, 6, 4];

/**
 * Step-count control for the MiniMax H3 tabs. Normally a free slider (1–50);
 * when PDD acceleration is on the PDD LoRAs are trained only on 8/6/4 steps,
 * so the control becomes a 4–8 slider (step 2), snapped to 8 on enable.
 */
export const MiniMaxH3Steps = () => {
    const pdd = useWatch({ name: 'pdd', defaultValue: false });
    const { getValues, setValue } = useFormContext();

    // When PDD is enabled, snap the step count to a valid PDD value.
    useEffect(() => {
        if (pdd && !PDD_STEPS.includes(getValues('steps'))) {
            setValue('steps', 8);
        }
    }, [pdd, getValues, setValue]);

    if (pdd) {
        return <SliderInput name='steps' defaultValue={8} min={4} max={8} step={2} />;
    }
    return <SliderInput name='steps' defaultValue={8} min={1} max={50} />;
};
