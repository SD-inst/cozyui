import { useEventCallback } from '@mui/material';
import { Workflow } from '../api/graph';
import { controlType } from '../redux/config';
import { generateRandomModName } from '../utils/safetensors';

export const useRefModOutputHandler = () => {
    return useEventCallback(
        (api: Workflow, _value: any, control: controlType) => {
            if (!control.node_id) return;
            api[control.node_id].inputs[control.field] =
                generateRandomModName();
        },
    );
};
