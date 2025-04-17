import { useCallback } from 'react';
import { insertNode } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { Optional } from './optional';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const CompileModelToggle = ({
    ...props
}: Optional<ToggleInputProps, 'name'>) => {
    const handler = useCallback(
        (api: any, value: boolean, control?: controlType) => {
            if (!value || !control) {
                return;
            }
            const compile_node = {
                inputs: {
                    backend: 'inductor',
                    model: null,
                },
                class_type: 'TorchCompileModel',
                _meta: {
                    title: 'TorchCompileModel',
                },
            };
            const compile_node_id = insertNode(
                api,
                control['output_node_id'],
                'model',
                compile_node
            );
            const patcher_node = {
                inputs: {
                    patch_order: 'weight_patch_first',
                    full_load: 'auto',
                    model: null,
                },
                class_type: 'PatchModelPatcherOrder',
                _meta: {
                    title: 'Patch Model Patcher Order',
                },
            };
            insertNode(api, compile_node_id, 'model', patcher_node);
        },
        []
    );
    useRegisterHandler({ name: props.name || 'compile_model', handler });
    return <ToggleInput name='compile_model' {...props} />;
};
