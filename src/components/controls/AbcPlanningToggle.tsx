import { useEventCallback } from '@mui/material';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useAppDispatch } from '../../redux/hooks';
import { delResult } from '../../redux/tab';
import { useRegisterHandler, useTabName } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const AbcPlanningToggle = ({ ...props }: ToggleInputProps) => {
    const tab_name = useTabName();
    const dispatch = useAppDispatch();
    const handler = useEventCallback(
        (api: Workflow, val: boolean, control: controlType) => {
            if (!control.node_id || !control.field) {
                return;
            }
            api[control.node_id].inputs[control.field] = val;
            if (val) {
                return;
            }
            if (control.preview_node_id) {
                delete api[control.preview_node_id];
                dispatch(delResult({ tab_name, id: control.preview_node_id }));
            }
            if (control.planner_node_id) {
                delete api[control.planner_node_id];
            }
            if (control.switch_node_id && control.empty_abc_node_id) {
                api[control.switch_node_id].inputs.on_true = [
                    control.empty_abc_node_id,
                    0,
                ];
            }
        },
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput {...props} />;
};
