import { FormControlLabel, Switch, SwitchProps } from '@mui/material';
import { cloneDeep } from 'lodash';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { useController } from 'react-hook-form';
import { getFreeNodeId, shiftIds } from '../../api/utils';
import { useRegisterHandler } from '../contexts/TabContext';
import { VideoResult } from './VideoResult';

const upscale_api_base = {
    '1': {
        inputs: {},
        class_type: 'GetImageSizeAndCount',
        _meta: {
            title: 'Get Image Size & Count',
        },
    },
    '2': {
        inputs: {
            expression: 'a*2',
            a: ['1', 1],
        },
        class_type: 'MathExpression|pysssss',
        _meta: {
            title: 'Math Expression 🐍',
        },
    },
    '3': {
        inputs: {
            expression: 'a*2',
            a: ['1', 2],
        },
        class_type: 'MathExpression|pysssss',
        _meta: {
            title: 'Math Expression 🐍',
        },
    },
    '4': {
        inputs: {
            model_name: '4x_foolhardy_Remacri.pth',
        },
        class_type: 'UpscaleModelLoader',
        _meta: {
            title: 'Load Upscale Model',
        },
    },
    '5': {
        inputs: {
            upscale_method: 'lanczos',
            width: ['2', 0],
            height: ['3', 0],
            crop: 'center',
            image: ['6', 0],
        },
        class_type: 'ImageScale',
        _meta: {
            title: 'Upscale Image',
        },
    },
    '6': {
        inputs: {
            upscale_model: ['4', 0],
            image: ['1', 0],
        },
        class_type: 'ImageUpscaleWithModel',
        _meta: {
            title: 'Upscale Image (using Model)',
        },
    },
    '7': {
        inputs: {
            ckpt_name: 'film_net_fp32.pt',
            clear_cache_after_n_frames: 20,
            multiplier: 2,
            frames: ['5', 0],
        },
        class_type: 'FILM VFI',
        _meta: {
            title: 'FILM VFI',
        },
    },
    '8': {
        inputs: {
            frame_rate: 48,
            loop_count: 0,
            filename_prefix: 'Hunyuan/2025_01_25/interpolate/vid',
            format: 'video/h264-mp4',
            pix_fmt: 'yuv420p',
            crf: 19,
            save_metadata: true,
            trim_to_audio: false,
            pingpong: false,
            save_output: true,
            images: ['7', 0],
        },
        class_type: 'VHS_VideoCombine',
        _meta: {
            title: 'Video Combine 🎥🅥🅗🅢',
        },
    },
};

export const UpscaleToggle = ({
    label,
    image_id,
    setUpscaledVideo,
    fps,
    multiplier = 2,
    ...props
}: {
    name: string;
    label?: string;
    image_id: string;
    setUpscaledVideo: Dispatch<SetStateAction<React.JSX.Element | undefined>>;
    multiplier?: number;
    fps: number;
} & SwitchProps) => {
    const { field } = useController({ name: props.name, defaultValue: false });
    const handler = useCallback(
        (api: any, values: boolean) => {
            if (!values) {
                setUpscaledVideo(undefined);
                return;
            }
            const base_id = getFreeNodeId(api);
            const upscale_api = cloneDeep(upscale_api_base) as any;
            shiftIds(upscale_api, base_id);
            upscale_api[`${base_id + 1}`].inputs.image = [image_id, 0];
            upscale_api[`${base_id + 7}`].inputs.multiplier = multiplier;
            upscale_api[`${base_id + 8}`].inputs.frame_rate = fps;
            setUpscaledVideo(
                <VideoResult
                    title='Upscaled video'
                    id={`${base_id + 8}`}
                    type='gifs'
                />
            );
            Object.assign(api, upscale_api);
        },
        [setUpscaledVideo, image_id]
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <FormControlLabel
            sx={{ mt: 1 }}
            label={label || props.name}
            control={<Switch {...field} />}
        />
    );
};
