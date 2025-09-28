import { Refresh } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams, setTab } from '../../redux/tab';
import toast from 'react-hot-toast';
import { useTranslate } from '../../i18n/I18nContext';

export const LoadParamsButton = ({ params }: { params?: string }) => {
    const tr = useTranslate();
    const dispatch = useAppDispatch();
    const handle = () => {
        if (!params) {
            toast.error(tr('toasts.no_params'));
            return;
        }
        const values = JSON.parse(params);
        dispatch(setParams({ action: actionEnum.RESTORE, ...values }));
        dispatch(setTab(values.tab));
        toast.success(tr('toasts.params_restored'));
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
