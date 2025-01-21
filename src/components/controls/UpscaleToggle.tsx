import { FormControlLabel, Switch, SwitchProps } from '@mui/material';
import { cloneDeep } from 'lodash';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { useController } from 'react-hook-form';
import { getFreeNodeId, shiftIds } from '../../api/utils';
import { useRegisterHandler } from '../../hooks/useRegisterHandler';
import { useWatchForm } from '../../hooks/useWatchForm';
import { VideoResult } from './VideoResult';

const upscale_api_base = {
    '1': {
        inputs: {
            ckpt_name: 'film_net_fp32.pt',
            clear_cache_after_n_frames: 20,
            multiplier: 2,
            frames: ['3', 0],
        },
        class_type: 'FILM VFI',
        _meta: {
            title: 'FILM VFI',
        },
    },
    '2': {
        inputs: {
            model_name: '4x_foolhardy_Remacri.pth',
        },
        class_type: 'UpscaleModelLoader',
        _meta: {
            title: 'Load Upscale Model',
        },
    },
    '3': {
        inputs: {
            upscale_method: 'lanczos',
            crop: 'center',
            image: ['4', 0],
            width: 0,
            height: 0,
        },
        class_type: 'ImageScale',
        _meta: {
            title: 'Upscale Image',
        },
    },
    '4': {
        inputs: {
            upscale_model: ['2', 0],
            image: [] as any,
        },
        class_type: 'ImageUpscaleWithModel',
        _meta: {
            title: 'Upscale Image (using Model)',
        },
    },
    '5': {
        inputs: {
            frame_rate: 48,
            loop_count: 0,
            filename_prefix: 'hunyuan_upscaled',
            format: 'video/h264-mp4',
            pix_fmt: 'yuv420p',
            crf: 19,
            save_metadata: false,
            trim_to_audio: false,
            pingpong: false,
            save_output: false,
            images: ['1', 0],
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
    ...props
}: {
    name: string;
    label?: string;
    image_id: string;
    setUpscaledVideo: Dispatch<SetStateAction<React.JSX.Element | undefined>>;
} & SwitchProps) => {
    const { field } = useController({ name: props.name, defaultValue: false });
    const width = useWatchForm('width');
    const height = useWatchForm('height');
    const handler = useCallback(
        (api: any, values: boolean) => {
            if (!values) {
                setUpscaledVideo(undefined);
                return;
            }
            const base_id = getFreeNodeId(api);
            const upscale_api = cloneDeep(upscale_api_base) as any;
            shiftIds(upscale_api, base_id);
            upscale_api[`${base_id + 4}`].inputs.image = [image_id, 0];
            upscale_api[`${base_id + 3}`].inputs.width = width * 2;
            upscale_api[`${base_id + 3}`].inputs.height = height * 2;
            setUpscaledVideo(
                <VideoResult
                    title='Upscaled video'
                    id={`${base_id + 5}`}
                    type='gifs'
                />
            );
            Object.assign(api, upscale_api);
        },
        [width, height, setUpscaledVideo, image_id]
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
