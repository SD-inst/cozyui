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
        // The stored names are the ones the server knew at the time; the
        // applier resolves each of them before anything reaches the form.
        dispatch(setParams({ action: actionEnum.RESTORE_HISTORY, ...values }));
        dispatch(setTab(values.tab));
        // The applier reports once the media has actually been resolved: what
        // was restored, what came back from a local copy, what is gone.
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
