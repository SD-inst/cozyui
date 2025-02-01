import { Checkbox, FormControlLabel } from '@mui/material';
import {
    save_outputs_locally,
    useSaveOutputsLocally,
} from '../../hooks/useSaveOutputsLocally';
import { db } from './db';

export const SaveOutputs = () => {
    const value = useSaveOutputsLocally();
    const updateSetting = (c: boolean) => {
        db.settings.put({ name: save_outputs_locally, value: '' + c });
    };
    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={value}
                    onChange={(_, c) => updateSetting(c)}
                />
            }
            label='Save generation results locally'
        />
    );
};
