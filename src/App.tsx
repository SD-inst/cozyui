import '@fontsource/roboto/400.css';
import { createTheme, ThemeProvider } from '@mui/material';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import { Progress } from './components/Progress';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { useGet } from './hooks/useGet';
import { setConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { setGenerationDisabled } from './redux/progress';
import { setTab } from './redux/tab';

function App() {
    const { data, error, isError, isSuccess } = useGet('config.json');
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (isSuccess) {
            toast.success('Got config');
            dispatch(setConfig(data));
            dispatch(setTab(Object.keys(data.tabs)[0]));
            dispatch(setGenerationDisabled(false));
            return;
        }
        if (!isError) {
            return;
        }
        toast.error('Error getting config: ' + error);
    }, [isError, error, isSuccess, data]);
    const theme = createTheme({
        colorSchemes: { dark: true },
        defaultColorScheme: 'dark',
    });
    return (
        <ThemeProvider theme={theme}>
            <WSReceiver />
            <VerticalBox>
                <WorkflowTabs>
                    {HunyanT2VTab}
                    {LTXI2VTab}
                </WorkflowTabs>
                <Progress />
            </VerticalBox>
            <Toaster
                position='bottom-center'
                toastOptions={{
                    style: {
                        background: theme.palette.background.default,
                        color: theme.palette.text.primary,
                    },
                }}
            />
        </ThemeProvider>
    );
}

export default App;
