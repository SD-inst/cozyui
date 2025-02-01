import { Refresh } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams } from '../../redux/tab';
import toast from 'react-hot-toast';

export const LoadParamsButton = ({ params }: { params?: string }) => {
    const dispatch = useAppDispatch();
    const handle = () => {
        if (!params) {
            toast.error('No generation parameters stored');
            return;
        }
        const values = JSON.parse(params);
        dispatch(setParams({ action: actionEnum.RESTORE, ...values }));
        toast.success('Generation parameters restored');
    };
    return (
        <Button
            disabled={!params}
            variant='outlined'
            color='info'
            onClick={handle}
            size='small'
        >
            <Refresh />
        </Button>
    );
};
