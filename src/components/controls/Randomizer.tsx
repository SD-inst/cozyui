import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Workflow } from '../../api/graph';
import { bigRandom } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';

export const Randomizer = () => {
    const { control, setValue } = useFormContext();
    const handler = useEventCallback(
        (api: Workflow, _value: any, control: controlType) => {
            if (!control.node_id || !control.prefix) {
                return;
            }
            const rnd = bigRandom(13);
            setValue('randomizer', rnd);
            api[control.node_id].inputs.filename_prefix = control.prefix + rnd;
        }
    );
    useRegisterHandler({ name: 'randomizer', handler });
    useEffect(() => {
        setValue('randomizer', '1');
    }, [setValue]);
    return (
        <Controller
            name='randomizer'
            control={control}
            defaultValue='1'
            render={() => <></>}
        />
    );
};
