import { Typography } from '@mui/material';
import { grey } from '@mui/material/colors';
import { useTranslate } from '../../i18n/I18nContext';

export const Version = () => {
    const tr = useTranslate();
    return (
        <Typography variant='body2' align='right' color={grey[700]}>
            {tr('settings.version', {
                version: import.meta.env.VITE_APP_VERSION,
            })}
        </Typography>
    );
};
