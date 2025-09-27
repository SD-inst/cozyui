import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { Randomizer } from '../controls/Randomizer';
import { SliderInput } from '../controls/SliderInput';
import { UploadType } from '../controls/UploadType';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='video' type={UploadType.VIDEO} />
                <SliderInput
                    name='multiplier'
                    defaultValue={2}
                    min={1}
                    max={5}
                />
                <Randomizer />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={'video'} />
            </GridBottom>
        </Layout>
    );
};

export const VideoInterpolationTab = (
    <WFTab
        label='Video interpolation'
        value='Video interpolation'
        group='Upscale'
        receivers={[{ name: 'video', acceptedTypes: 'gifs' }]}
        content={<Content />}
    />
);
