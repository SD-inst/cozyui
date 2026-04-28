import { Box, useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { insertGraph } from '../../../api/utils';
import { useControl } from '../../../hooks/useAPI';
import { useResultParam } from '../../../hooks/useResult';
import { useRegisterHandler } from '../../contexts/TabContext';
import { LengthInput } from '../LengthSlider';
import { ToggleInput } from '../ToggleInput';

type TValue = {
    enabled: boolean;
    overlap: number;
};

const defaultValue: TValue = {
    enabled: false,
    overlap: 24,
};

export const LTX2LoopControl = ({ name }: { name: string }) => {
    const { id } = useResultParam();
    const lengthCtl = useControl('length');
    const enabled = useWatch({
        name: name + '.enabled',
        defaultValue: defaultValue.enabled,
    });
    const overlap = useWatch({
        name: name + '.overlap',
        defaultValue: defaultValue.overlap,
    });
    const image = useWatch({ name: 'image' });
    const length = useWatch({ name: 'length', defaultValue: 129 });
    const keyframes = useWatch({ name: 'keyframes', defaultValue: [] });
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    const { append } = useFieldArray({ name: 'keyframes' });
    const { setValue } = useFormContext();
    const handler = useEventCallback((api: any, value: TValue) => {
        if (!value || !value.enabled) {
            return;
        }
        const graph = {
            ':1': {
                inputs: {
                    batch_index: 0,
                    length: length - 1,
                    image: api[id].inputs.images,
                },
                class_type: 'ImageFromBatch',
                _meta: {
                    title: 'ImageFromBatch Target',
                },
            },
            ':2': {
                inputs: {
                    batch_index: 0,
                    length: 1,
                    image: api[id].inputs.images,
                },
                class_type: 'ImageFromBatch',
                _meta: {
                    title: 'ImageFromBatch Reference',
                },
            },
            ':3': {
                inputs: {
                    method: 'reinhard_lab_gpu',
                    strength: 1,
                    multithread: true,
                    image_target: [':1', 0],
                    image_ref: [':2', 0],
                },
                class_type: 'ColorMatchV2',
                _meta: {
                    title: 'ColorMatchV2',
                },
            },
        };
        const newNodeID = insertGraph(api, graph);
        api[id].inputs.images = [newNodeID + ':3', 0];
        api[lengthCtl.id].inputs[lengthCtl.field] = length + value.overlap;
    });
    useRegisterHandler({ name, handler });
    useEffect(() => {
        if (!enabled || !image) {
            return;
        }
        let found = false;
        (keyframes as any[]).forEach((kf: any, idx) => {
            if (kf.image !== image) {
                return;
            }
            if (kf.position !== length - 1 || kf.trim !== overlap) {
                setValue(`keyframes.${idx}.position`, length - 1);
                setValue(`keyframes.${idx}.enabled`, true);
                setValue(`keyframes.${idx}.trim`, overlap);
            }
            found = true;
        });
        if (found) {
            return;
        }
        append({
            enabled: true,
            image,
            position: length - 1,
            strength: 0.5,
            trim: overlap,
        });
    }, [append, enabled, image, keyframes, length, overlap, setValue]);
    return (
        <Box
            display='flex'
            flexDirection='column'
            gap={2}
            border='1px gray solid'
            borderRadius={3}
            p={2}
        >
            <ToggleInput
                name={`${name}.enabled`}
                defaultValue={defaultValue.enabled}
            />
            {enabled && (
                <LengthInput
                    min={8}
                    max={160}
                    step={8}
                    fps={fps}
                    name={`${name}.overlap`}
                    defaultValue={defaultValue.overlap}
                />
            )}
        </Box>
    );
};
