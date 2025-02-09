import { useTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';

export const ThemedToaster = () => {
    const theme = useTheme();
    return (
        <Toaster
            position='bottom-center'
            toastOptions={{
                style: {
                    background: theme.palette.background.default,
                    color: theme.palette.text.primary,
                },
            }}
        />
    );
};
