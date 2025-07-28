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
import { FluxTab } from './components/tabs/Flux';
import { ChromaTab } from './components/tabs/Chroma';
import { WorkflowTabsContextProvider } from './components/contexts/WorkflowTabsContextProvider';
import { ChromaUpscaleTab } from './components/tabs/ChromaUpscale';
import { TagLoader } from './components/controls/TagAutocomplete';
import { WanI2VTab } from './components/tabs/WanI2V';
import { WanT2VTab } from './components/tabs/WanT2V';
import { FluxKontextTab } from './components/tabs/FluxKontext';
import { WanI2V2STab } from './components/tabs/WanI2V2S';
import { ChatterboxTab } from './components/tabs/ChatterboxTTS';
import { ChatterboxDialogTab } from './components/tabs/ChatterboxTTSDialog';

function App() {
    return (
        <ThemeContext>
            <I18nContextProvider>
                <ConfigLoader />
                <TagLoader />
                <ResultOverrideContextProvider>
                    <WSReceiver />
                    <VerticalBox>
                        <WorkflowTabsContextProvider>
                            <WorkflowTabs>
                                {HunyanT2VTab}
                                {WanT2VTab}
                                {ChromaTab}
                                {FluxKontextTab}
                                {WanI2VTab}
                                {WanI2V2STab}
                                {HunyanI2VTab}
                                {FramePackI2VTab}
                                {HiDreamTab}
                                {FluxTab}
                                {HunyanT2VKJTab}
                                {HunyanI2VKJTab}
                                {LTXI2VTab}
                                {EasyAnimateI2VTab}
                                {StableAudioTab}
                                {MMAudioTab}
                                {ChatterboxTab}
                                {ChatterboxDialogTab}
                                {HunyanUpscale}
                                {ChromaUpscaleTab}
                            </WorkflowTabs>
                            <Progress />
                            <InterruptButton />
                            <FilterContextProvider>
                                <HistoryPanel />
                                <AppSettings />
                            </FilterContextProvider>
                        </WorkflowTabsContextProvider>
                    </VerticalBox>
                    <ThemedToaster />
                    <NotificationSound />
                </ResultOverrideContextProvider>
            </I18nContextProvider>
        </ThemeContext>
    );
}

export default App;
