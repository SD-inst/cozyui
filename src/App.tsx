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
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { useGet } from './hooks/useGet';
import { configType, setConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { setGenerationDisabled } from './redux/progress';
import { setTab } from './redux/tab';
import { HunyanT2VTabKJ } from './components/tabs/HunyuanT2VKJ';
import { EasyAnimateI2VTab } from './components/tabs/EasyAnimate';
import { InterruptButton } from './components/controls/InterruptButton';
import { HunyanI2VTab } from './components/tabs/HunyuanI2V';

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
                    {LTXI2VTab}
                    {EasyAnimateI2VTab}
                    {HunyanT2VTabKJ}
                </WorkflowTabs>
                <Progress />
                <InterruptButton />
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
