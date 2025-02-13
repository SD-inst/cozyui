import '@fontsource/roboto/400.css';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import './App.css';
import { Progress } from './components/Progress';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { ThemeContext } from './components/contexts/ThemeContext';
import { InterruptButton } from './components/controls/InterruptButton';
import { ThemedToaster } from './components/controls/ThemedToaster';
import { HistoryPanel } from './components/history/HistoryPanel';
import { AppSettings } from './components/controls/AppSettings';
import { EasyAnimateI2VTab } from './components/tabs/EasyAnimate';
import { HunyanI2VTab } from './components/tabs/HunyuanI2V';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { HunyanT2VTabKJ } from './components/tabs/HunyuanT2VKJ';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { StableAudioTab } from './components/tabs/StableAudio';
import { useApiURL } from './hooks/useApiURL';
import { useGet } from './hooks/useGet';
import { mergeConfig, setConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { ResultOverrideContextProvider } from './components/contexts/ResultOverrideContextProvider';

function App() {
    const {
        data: dataConfig,
        error: errorConfig,
        isError: isErrorConfig,
        isSuccess: isSuccessConfig,
    } = useGet({ url: 'config.json', staleTime: Infinity });
    const {
        data: dataLocalConfig,
        error: errorLocalConfig,
        isError: isErrorLocalConfig,
        isSuccess: isSuccessLocalConfig,
    } = useGet({
        url: 'config.local.json',
        staleTime: Infinity,
        enabled: isSuccessConfig,
    });
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
    }, [isErrorConfig, errorConfig, isSuccessConfig, dataConfig, dispatch]);
    useEffect(() => {
        if (isErrorLocalConfig) {
            console.error('Error getting local config: ' + errorLocalConfig);
        }
        if (!isSuccessLocalConfig) {
            return;
        }
        toast.success('Got local config');
        dispatch(mergeConfig(dataLocalConfig));
    }, [
        isErrorLocalConfig,
        errorLocalConfig,
        isSuccessLocalConfig,
        dataLocalConfig,
        dispatch,
    ]);
    useEffect(() => {
        if (isErrorObj) {
            toast.error('Error getting object info: ' + errorObj);
        }
        if (!isSuccessObj) {
            return;
        }
        toast.success('Objects updated');
        dispatch(mergeConfig({ object_info: dataObj }));
    }, [isErrorObj, errorObj, isSuccessObj, dataObj, dataConfig, dispatch]);

    return (
        <ThemeContext>
            <ResultOverrideContextProvider>
                <WSReceiver />
                <VerticalBox>
                    <WorkflowTabs>
                        {HunyanT2VTab}
                        {HunyanI2VTab}
                        {HunyanT2VTabKJ}
                        {LTXI2VTab}
                        {EasyAnimateI2VTab}
                        {StableAudioTab}
                    </WorkflowTabs>
                    <Progress />
                    <InterruptButton />
                    <HistoryPanel />
                    <AppSettings />
                </VerticalBox>
                <ThemedToaster />
            </ResultOverrideContextProvider>
        </ThemeContext>
    );
}

export default App;
