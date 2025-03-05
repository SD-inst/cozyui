import { Button, ButtonProps } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useResult } from '../../hooks/useResult';
import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams } from '../../redux/tab';
import { useFormContext } from 'react-hook-form';
import { useApiURL } from '../../hooks/useApiURL';
import { makeOutputUrl } from '../../api/utils';
import toast from 'react-hot-toast';

export const SendToUpscaleButton = ({ ...props }: ButtonProps) => {
    const tr = useTranslate();
    const result = useResult();
    const dispatch = useAppDispatch();
    const { getValues } = useFormContext();
    const apiUrl = useApiURL();
    const handleClick = async () => {
        const { prompt, model } = getValues();
        const formData = new FormData();
        const url = makeOutputUrl(apiUrl, result[0]);
        const file = await fetch(url).then((b) => b.blob());
        formData.append('image', new File([file], result[0].filename));
        const image = await fetch(apiUrl + '/api/upload/image', {
            method: 'POST',
            body: formData,
        })
            .then((r) => r.json())
            .then((j) => j.name)
            .catch((e) => toast(tr('toasts.error_uploading', { err: e })));
        dispatch(
            setParams({
                action: actionEnum.RESTORE,
                tab: 'Hunyuan Upscale',
                values: {
                    prompt,
                    model,
                    image,
                },
            })
        );
    };
    if (!result.length) {
        return null;
    }
    return (
        <Button
            variant='contained'
            color='secondary'
            onClick={handleClick}
            {...props}
        >
            {tr('controls.send_to_upscale')}
        </Button>
    );
};
