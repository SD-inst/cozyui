import { useCallback } from 'react';
import { insertNode } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { Optional } from './optional';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const KJCompileModelToggle = ({
    classType,
    ...props
}: Optional<ToggleInputProps, 'name'> & { classType: string }) => {
    const handler = useCallback(
        (api: any, value: boolean, control?: controlType) => {
            if (!value || !control) {
                return;
            }
            const compile_node = {
                inputs: {
                    mode: 'default',
                    backend: 'inductor',
                    fullgraph: false,
                    dynamic: true,
                    dynamo_cache_size_limit: 64,
                    compile_single_blocks: true,
                    compile_double_blocks: true,
                },
                class_type: classType,
                _meta: {
                    title: classType,
                },
            };
            insertNode(
                api,
                control['output_node_id'],
                'compile_args',
                compile_node
            );
        },
        [classType]
    );
    useRegisterHandler({ name: props.name || 'compile_model', handler });
    return <ToggleInput name='compile_model' {...props} />;
};
