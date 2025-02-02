import '@fontsource/roboto/400.css';
import {
    autocompleteClasses,
    Box,
    createTheme,
    ThemeProvider,
} from '@mui/material';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import { Progress } from './components/Progress';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { InterruptButton } from './components/controls/InterruptButton';
import { EasyAnimateI2VTab } from './components/tabs/EasyAnimate';
import { HunyanI2VTab } from './components/tabs/HunyuanI2V';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { HunyanT2VTabKJ } from './components/tabs/HunyuanT2VKJ';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { useApiURL } from './hooks/useApiURL';
import { useGet } from './hooks/useGet';
import { setConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { setGenerationDisabled } from './redux/progress';
import { HistoryPanel } from './components/history/HistoryPanel';
import { HistorySettings } from './components/history/HistorySettings';

const theme = createTheme({
    colorSchemes: { dark: true },
    defaultColorScheme: 'dark',
    components: {
        MuiAutocomplete: {
            defaultProps: {
                renderOption(props, option, _, ownerState) {
                    const { key, ...optionProps } = props;
                    return (
                        <Box
                            key={key}
                            sx={{
                                borderRadius: '8px',
                                wordBreak: 'break-all',
                                margin: '5px',
                                [`&.${autocompleteClasses.option}`]: {
                                    padding: '8px',
                                },
                            }}
                            component='li'
                            {...optionProps}
                        >
                            {ownerState.getOptionLabel(option)}
                        </Box>
                    );
                },
            },
        },
    },
});

function App() {
    const {
        data: dataConfig,
        error: errorConfig,
        isError: isErrorConfig,
        isSuccess: isSuccessConfig,
    } = useGet({ url: 'config.json', staleTime: Infinity });
    const apiUrl = useApiURL();
    const {
        data: dataObj,
        error: errorObj,
        isError: isErrorObj,
        isSuccess: isSuccessObj,
    } = useGet({
        url: apiUrl + '/api/object_info',
        enabled: isSuccessConfig && !!apiUrl,
        cache: true,
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
        dispatch(setGenerationDisabled(false));
    }, [isErrorConfig, errorConfig, isSuccessConfig, dataConfig, dispatch]);
    useEffect(() => {
        if (isErrorObj) {
            toast.error('Error getting object info: ' + errorObj);
        }
        if (!isSuccessObj) {
            return;
        }
        toast.success('Objects updated');
        dispatch(setConfig({ ...dataConfig, object_info: dataObj }));
    }, [isErrorObj, errorObj, isSuccessObj, dataObj, dataConfig, dispatch]);

    return (
        <ThemeProvider theme={theme}>
            <WSReceiver />
            <VerticalBox>
                <WorkflowTabs>
                    {HunyanT2VTab}
                    {HunyanI2VTab}
                    {HunyanT2VTabKJ}
                    {LTXI2VTab}
                    {EasyAnimateI2VTab}
                </WorkflowTabs>
                <Progress />
                <InterruptButton />
                <HistoryPanel />
                <HistorySettings />
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
