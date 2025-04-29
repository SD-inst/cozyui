import { Refresh } from '@mui/icons-material';
import { Tooltip, Button } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useApiURL } from '../../hooks/useApiURL';
import { useTranslate } from '../../i18n/I18nContext';

export const ObjectReloadButton = () => {
    const tr = useTranslate();
    const apiUrl = useApiURL();
    const qc = useQueryClient();
    return (
        <Tooltip arrow title={tr('controls.lora_reload')}>
            <Button
                variant='outlined'
                onClick={() =>
                    qc
                        .invalidateQueries({
                            queryKey: [apiUrl + '/api/object_info'],
                        })
                        .then(() =>
                            toast.success(tr('toasts.reloaded_objects'))
                        )
                }
            >
                <Refresh />
            </Button>
        </Tooltip>
    );
};
