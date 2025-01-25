import { Button, ButtonProps } from '@mui/material';
import { useApiURL } from '../../hooks/useApiURL';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setGenerationDisabled, setStatus } from '../../redux/progress';
import { setPromptId } from '../../redux/tab';

export const InterruptButton = ({ ...props }: ButtonProps) => {
    const prompt_id = useAppSelector((s) => s.tab.prompt_id);
    const apiUrl = useApiURL();
    const dispatch = useAppDispatch();
    if (!prompt_id) {
        return null;
    }
    const handleInterrupt = () => {
        fetch(apiUrl + '/api/interrupt_id', {
            method: 'POST',
            body: JSON.stringify({ id: prompt_id }),
        }).finally(() => {
            dispatch(setGenerationDisabled(false));
            dispatch(setPromptId(''));
            dispatch(setStatus('Cancelled'));
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
