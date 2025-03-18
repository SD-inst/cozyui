import { Typography } from '@mui/material';
import { grey } from '@mui/material/colors';

export const Version = () => {
    return (
        <Typography variant='body2' align='right' color={grey[700]}>
            v. {import.meta.env.VITE_APP_VERSION}
        </Typography>
    );
};
