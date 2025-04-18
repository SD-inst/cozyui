import '@fontsource/roboto/400.css';
import './App.css';
import { ConfigLoader } from './ConfigLoader';
import { Progress } from './components/Progress';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { ResultOverrideContextProvider } from './components/contexts/ResultOverrideContextProvider';
import { ThemeContext } from './components/contexts/ThemeContext';
import { InterruptButton } from './components/controls/InterruptButton';
import { NotificationSound } from './components/controls/NotificationSound';
import { ThemedToaster } from './components/controls/ThemedToaster';
import { HistoryPanel } from './components/history/HistoryPanel';
import { AppSettings } from './components/settings/AppSettings';
import { EasyAnimateI2VTab } from './components/tabs/EasyAnimate';
import { HunyanI2VTab } from './components/tabs/HunyuanI2V';
import { HunyanI2VKJTab } from './components/tabs/HunyuanI2VKJ';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { HunyanT2VKJTab } from './components/tabs/HunyuanT2VKJ';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { StableAudioTab } from './components/tabs/StableAudio';
import { I18nContextProvider } from './i18n/I18nContextProvider';
import { HunyanUpscale } from './components/tabs/HunyuanUpscale';
import { FilterContextProvider } from './components/contexts/FilterContextProvider';
import { MMAudioTab } from './components/tabs/MMAudio';
import { HiDreamTab } from './components/tabs/HiDream';
import { FramePackI2VTab } from './components/tabs/FramePackI2V';

function App() {
    return (
        <ThemeContext>
            <I18nContextProvider>
                <ConfigLoader />
                <ResultOverrideContextProvider>
                    <WSReceiver />
                    <VerticalBox>
                        <WorkflowTabs>
                            {HunyanT2VTab}
                            {HunyanI2VTab}
                            {FramePackI2VTab}
                            {HunyanUpscale}
                            {HiDreamTab}
                            {HunyanT2VKJTab}
                            {HunyanI2VKJTab}
                            {LTXI2VTab}
                            {EasyAnimateI2VTab}
                            {StableAudioTab}
                            {MMAudioTab}
                        </WorkflowTabs>
                        <Progress />
                        <InterruptButton />
                        <FilterContextProvider>
                            <HistoryPanel />
                            <AppSettings />
                        </FilterContextProvider>
                    </VerticalBox>
                    <ThemedToaster />
                    <NotificationSound />
                </ResultOverrideContextProvider>
            </I18nContextProvider>
        </ThemeContext>
    );
}

export default App;
