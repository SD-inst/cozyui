import { Button, ButtonProps } from '@mui/material';
import { useApiURL } from '../../hooks/useApiURL';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setStatus, statusEnum } from '../../redux/progress';
import { clearPrompt } from '../../redux/tab';
import { useTranslate } from '../../i18n/I18nContext';

export const InterruptButton = ({ ...props }: ButtonProps) => {
    const prompts = useAppSelector((s) => s.tab.prompt);
    const status = useAppSelector((s) => s.progress.status);
    const apiUrl = useApiURL();
    const tr = useTranslate();
    const dispatch = useAppDispatch();
    const prompt_ids = Object.keys(prompts);
    if (!prompt_ids.length) {
        return null;
    }
    if (status !== statusEnum.RUNNING && status !== statusEnum.WAITING) {
        return null;
    }
    const handleInterrupt = () => {
        const interrupt = (cnt: number) => {
            fetch(apiUrl + '/api/interrupt', {
                method: 'POST',
                body: JSON.stringify({ id: prompt_ids[0] }),
            })
                .then((r) => {
                    if (r.status !== 200) {
                        throw new Error(`Bad status ${r.status}`);
                    }
                })
                .catch((r) => {
                    console.log('Error interrupting: ', r);
                    if (cnt > 0) {
                        console.log('Retrying interrupt...');
                        setTimeout(interrupt, 1000, cnt - 1);
                    }
                })
                .finally(() => {
                    dispatch(clearPrompt());
                    dispatch(setStatus(statusEnum.CANCELLED));
                });
        };
        interrupt(5);
    };
    return (
        <Button
            color='error'
            variant='contained'
            onClick={handleInterrupt}
            {...props}
        >
            {tr('controls.interrupt')}
        </Button>
    );
};
