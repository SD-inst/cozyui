import { Button, ButtonProps } from '@mui/material';
import { useApiURL } from '../../hooks/useApiURL';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setStatus, statusEnum } from '../../redux/progress';
import { setPromptId } from '../../redux/tab';

export const InterruptButton = ({ ...props }: ButtonProps) => {
    const prompt_id = useAppSelector((s) => s.tab.prompt_id);
    const status = useAppSelector((s) => s.progress.status);
    const apiUrl = useApiURL();
    const dispatch = useAppDispatch();
    if (
        !prompt_id ||
        (status !== statusEnum.RUNNING && status !== statusEnum.WAITING)
    ) {
        return null;
    }
    const handleInterrupt = () => {
        fetch(apiUrl + '/api/interrupt', {
            method: 'POST',
            body: JSON.stringify({ id: prompt_id }),
        }).finally(() => {
            dispatch(setPromptId(''));
            dispatch(setStatus(statusEnum.CANCELLED));
        });
    };
    return (
        <Button
            color='error'
            variant='contained'
            onClick={handleInterrupt}
            {...props}
        >
            Interrupt
        </Button>
    );
};
