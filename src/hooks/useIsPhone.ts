import { useMediaQuery, useTheme } from '@mui/material';

export const useIsPhone = () => {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down('sm'));
    return phone;
};
