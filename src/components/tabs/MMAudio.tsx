import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { AudioResult } from '../controls/AudioResult';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UploadType } from '../controls/UploadType';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='video' type={UploadType.VIDEO} />
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <TextInput name='neg_prompt' multiline sx={{ mb: 2 }} />
                <SliderInput name='steps' defaultValue={25} min={1} max={50} />
                <CFGInput defaultValue={4.5} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult />
                <ResultOverrideContextProvider value={{ index: 1 }}>
                    <AudioResult noAutoplay />
                </ResultOverrideContextProvider>
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MMAudioTab = (
    <WFTab label='MM Audio' value='MM Audio' group='Audio' content={<Content />} />
);
