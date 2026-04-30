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
import { ACEStepTab } from './components/tabs/audio/ACEStep';
import { ChatterboxTab } from './components/tabs/audio/ChatterboxTTS';
import { ChatterboxDialogTab } from './components/tabs/audio/ChatterboxTTSDialog';
import { ChromaTab } from './components/tabs/t2i/Chroma';
import { ChromaUpscaleTab } from './components/tabs/upscale/ChromaUpscale';
import { FluxTab } from './components/tabs/t2i/Flux';
import { Flux2Tab } from './components/tabs/t2i/Flux2';
import { FluxKontextTab } from './components/tabs/i2i/FluxKontext';
import { FramePackI2VTab } from './components/tabs/i2v/FramePackI2V';
import { HiDreamTab } from './components/tabs/t2i/HiDream';
import { Hunyan15I2VTab } from './components/tabs/i2v/Hunyuan15I2V';
import { Hunyan15T2VTab } from './components/tabs/t2v/Hunyuan15T2V';
import { HunyanI2VTab } from './components/tabs/i2v/HunyuanI2V';
import { HunyanI2VKJTab } from './components/tabs/i2v/HunyuanI2VKJ';
import { HunyanT2VTab } from './components/tabs/t2v/HunyuanT2V';
import { HunyanT2VKJTab } from './components/tabs/t2v/HunyuanT2VKJ';
import { HunyanUpscale } from './components/tabs/upscale/HunyuanUpscale';
import { LTX2I2VTab } from './components/tabs/i2v/LTX2I2V';
import { LTX2T2VTab } from './components/tabs/t2v/LTX2T2V';
import { MMAudioTab } from './components/tabs/audio/MMAudio';
import { OviI2VTab } from './components/tabs/i2v/OviI2V';
import { OviT2VTab } from './components/tabs/t2v/OviT2V';
import { QwenImageTab } from './components/tabs/t2i/QwenImage';
import { QwenImageEditTab } from './components/tabs/i2i/QwenImageEdit';
import { SDTab } from './components/tabs/t2i/SD';
import { SDUpscaleTab } from './components/tabs/upscale/SDUpscale';
import { SongBloomTab } from './components/tabs/audio/SongBloom';
import { StableAudioTab } from './components/tabs/audio/StableAudio';
import { VibeVoiceTab } from './components/tabs/audio/VibeVoiceTTS';
import { VibeVoiceDialogTab } from './components/tabs/audio/VibeVoiceTTSDialog';
import { VideoInterpolationTab } from './components/tabs/upscale/VideoInterpolation';
import { WanI2VTab } from './components/tabs/i2v/WanI2V';
import { WanI2V2STab } from './components/tabs/i2v/WanI2V2S';
import { WanI2VITTab } from './components/tabs/i2v/WanI2VIT';
import { WanT2VTab } from './components/tabs/t2v/WanT2V';
import { ZImageTab } from './components/tabs/t2i/ZImage';
import { I18nContextProvider } from './i18n/I18nContextProvider';
import { AnimaTab } from './components/tabs/t2i/Anima';
import { LTX23T2VTab } from './components/tabs/t2v/LTX23T2V';
import { LTX23I2VTab } from './components/tabs/i2v/LTX23I2V';
import { LTX23V2VTab } from './components/tabs/v2v/LTX23V2V';

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
                                {LTX2T2VTab}
                                {LTX23T2VTab}
                                {Hunyan15T2VTab}
                                {WanI2VTab}
                                {WanT2VTab}
                                {OviT2VTab}
                                {ChromaTab}
                                {SDTab}
                                {AnimaTab}
                                {ZImageTab}
                                {QwenImageTab}
                                {FluxKontextTab}
                                {QwenImageEditTab}
                                {WanI2VITTab}
                                {LTX2I2VTab}
                                {LTX23I2VTab}
                                {LTX23V2VTab}
                                {OviI2VTab}
                                {WanI2V2STab}
                                {HunyanI2VTab}
                                {Hunyan15I2VTab}
                                {FramePackI2VTab}
                                {HiDreamTab}
                                {FluxTab}
                                {Flux2Tab}
                                {HunyanT2VKJTab}
                                {HunyanI2VKJTab}
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
