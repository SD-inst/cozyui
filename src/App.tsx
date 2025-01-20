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
import { configType, setConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { setGenerationDisabled } from './redux/progress';
import { setTab } from './redux/tab';

function App() {
    const {
        data: dataConfig,
        error: errorConfig,
        isError: isErrorConfig,
        isSuccess: isSuccessConfig,
    } = useGet({ url: 'config.json', staleTime: Infinity });
    const {
        data: dataObj,
        error: errorObj,
        isError: isErrorObj,
        isSuccess: isSuccessObj,
    } = useGet({
        url: (dataConfig as configType)?.api + '/api/object_info',
        enabled: isSuccessConfig,
    });
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (isErrorConfig) {
            toast.error('Error getting config: ' + errorConfig);
        }
        if (!isSuccessConfig) {
            return;
        }
        toast.success('Got config');
        dispatch(setConfig(dataConfig));
        dispatch(setTab(Object.keys(dataConfig.tabs)[0]));
        dispatch(setGenerationDisabled(false));
    }, [isErrorConfig, errorConfig, isSuccessConfig, dataConfig]);
    useEffect(() => {
        if (isErrorObj) {
            toast.error('Error getting object info: ' + errorObj);
        }
        if (!isSuccessObj) {
            return;
        }
        toast.success('Objects updated');
        dispatch(setConfig({ ...dataConfig, object_info: dataObj }));
    }, [isErrorObj, errorObj, isSuccessObj, dataObj]);
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
