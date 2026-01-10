import { Box, useEventCallback } from '@mui/material';
import { cloneDeep } from 'lodash';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { ToggleInput } from './ToggleInput';

export const WanEndImage = ({
    name,
    imageUploadName = 'image_end',
}: {
    name: string;
    imageUploadName?: string;
}) => {
    const useEndImage = useWatch({ name });
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            if (
                !control.image_node_id ||
                !control.i2v_encode_node_id ||
                !control.clip_vision_node_id ||
                !control.resize_node_id
            ) {
                console.log(
                    'Not all parameters set for Wan end image, check config.json'
                );
                return;
            }
            if (!value) {
                return;
            }
            const resizeNode = cloneDeep(api[control.resize_node_id]);
            resizeNode.inputs.image = [control.image_node_id, 0];
            const resizeNodeId = '' + getFreeNodeId(api);
            api[resizeNodeId] = resizeNode;
            api[control.clip_vision_node_id].inputs.image_2 = [resizeNodeId, 0];
            api[control.i2v_encode_node_id].inputs.end_image = [
                resizeNodeId,
                0,
            ];
            api[control.image_node_id].inputs.image =
                getValues(imageUploadName);
        }
    );
    useRegisterHandler({ name, handler });
    return (
        <Box display='flex' flexDirection='column' gap={1}>
            <ToggleInput name={name} />
            {useEndImage && <FileUpload name={imageUploadName} />}
        </Box>
    );
};
