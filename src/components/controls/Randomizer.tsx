import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { bigRandom } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';

export const Randomizer = () => {
    const { setValue } = useFormContext();
    const handler = useEventCallback(
        (api: any, _value: any, control?: controlType) => {
            if (!control || !control.node_id || !control.prefix) {
                return;
            }
            const rnd = bigRandom(13);
            setValue('randomizer', rnd);
            api[control.node_id].inputs.filename_prefix = control.prefix + rnd;
        },
    );
    useRegisterHandler({ name: 'randomizer', handler });
    useEffect(() => {
        setValue('randomizer', '1');
    }, [setValue]);
    return null;
};
