import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { Randomizer } from '../../controls/Randomizer';
import { UploadType } from '../../controls/UploadType';
import { VideoInterpolationSlider } from '../../controls/VideoInterpolationSlider';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='video' type={UploadType.VIDEO} />
                <VideoInterpolationSlider name='multiplier' />
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
        group='Postprocessing'
        receivers={[{ name: 'video', acceptedTypes: 'gifs' }]}
        content={<Content />}
    />
);
