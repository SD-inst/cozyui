import '@fontsource/roboto/400.css';
import './App.css';
import { ConfigLoader } from './ConfigLoader';
import { Progress } from './components/Progress';
import { VerticalBox } from './components/VerticalBox';
import { WSReceiver } from './components/WSReceiver';
import { WorkflowTabs } from './components/WorkflowTabs';
import { FilterContextProvider } from './components/contexts/FilterContextProvider';
import { ResultOverrideContextProvider } from './components/contexts/ResultOverrideContextProvider';
import { ThemeContext } from './components/contexts/ThemeContext';
import { WorkflowTabsContextProvider } from './components/contexts/WorkflowTabsContextProvider';
import { InterruptButton } from './components/controls/InterruptButton';
import { NotificationSound } from './components/controls/NotificationSound';
import { TagLoader } from './components/controls/TagAutocomplete';
import { ThemedToaster } from './components/controls/ThemedToaster';
import { HistoryPanel } from './components/history/HistoryPanel';
import { AppSettings } from './components/settings/AppSettings';
import { ChatterboxTab } from './components/tabs/ChatterboxTTS';
import { ChatterboxDialogTab } from './components/tabs/ChatterboxTTSDialog';
import { ChromaTab } from './components/tabs/Chroma';
import { ChromaUpscaleTab } from './components/tabs/ChromaUpscale';
import { EasyAnimateI2VTab } from './components/tabs/EasyAnimate';
import { FluxTab } from './components/tabs/Flux';
import { FluxKontextTab } from './components/tabs/FluxKontext';
import { FramePackI2VTab } from './components/tabs/FramePackI2V';
import { HiDreamTab } from './components/tabs/HiDream';
import { HunyanI2VTab } from './components/tabs/HunyuanI2V';
import { HunyanI2VKJTab } from './components/tabs/HunyuanI2VKJ';
import { HunyanT2VTab } from './components/tabs/HunyuanT2V';
import { HunyanT2VKJTab } from './components/tabs/HunyuanT2VKJ';
import { HunyanUpscale } from './components/tabs/HunyuanUpscale';
import { LTXI2VTab } from './components/tabs/LTXI2V';
import { MMAudioTab } from './components/tabs/MMAudio';
import { QwenImageTab } from './components/tabs/QwenImage';
import { QwenImageEditTab } from './components/tabs/QwenImageEdit';
import { SDTab } from './components/tabs/SD';
import { SDUpscaleTab } from './components/tabs/SDUpscale';
import { StableAudioTab } from './components/tabs/StableAudio';
import { VibeVoiceTab } from './components/tabs/VibeVoiceTTS';
import { VibeVoiceDialogTab } from './components/tabs/VibeVoiceTTSDialog';
import { WanI2VTab } from './components/tabs/WanI2V';
import { WanI2V2STab } from './components/tabs/WanI2V2S';
import { WanI2VITTab } from './components/tabs/WanI2VIT';
import { WanT2VTab } from './components/tabs/WanT2V';
import { I18nContextProvider } from './i18n/I18nContextProvider';
import { ACEStepTab } from './components/tabs/ACEStep';
import { SongBloomTab } from './components/tabs/SongBloom';
import { VideoInterpolationTab } from './components/tabs/VideoInterpolation';
import { OviI2VTab } from './components/tabs/OviI2V';
import { OviT2VTab } from './components/tabs/OviT2V';
import { Hunyan15T2VTab } from './components/tabs/Hunyuan15T2V';
import { Hunyan15I2VTab } from './components/tabs/Hunyuan15I2V';

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
                                {Hunyan15T2VTab}
                                {WanI2VTab}
                                {WanT2VTab}
                                {OviT2VTab}
                                {ChromaTab}
                                {SDTab}
                                {QwenImageTab}
                                {FluxKontextTab}
                                {QwenImageEditTab}
                                {WanI2VITTab}
                                {OviI2VTab}
                                {WanI2V2STab}
                                {HunyanI2VTab}
                                {Hunyan15I2VTab}
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
                                {VibeVoiceTab}
                                {VibeVoiceDialogTab}
                                {ACEStepTab}
                                {SongBloomTab}
                                {SDUpscaleTab}
                                {HunyanUpscale}
                                {ChromaUpscaleTab}
                                {VideoInterpolationTab}
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
