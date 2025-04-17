import { modelType } from '../../redux/config';
import { useHyvModelChoices } from '../tabs/hyv_models';
import { ModelSelectInput } from './ModelSelectInput';
import { CustomSelectInputProps } from './SelectInput';

export const HYModelSelectInput = ({
    filter,
    ...props
}: CustomSelectInputProps & { filter?: (m: modelType) => boolean }) => {
    const hyv_models = useHyvModelChoices(filter);
    return (
        <ModelSelectInput
            defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
            choices={hyv_models}
            {...props}
        />
    );
};
