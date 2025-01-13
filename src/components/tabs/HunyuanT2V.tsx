import { SeedInput } from '../controls/SeedInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => (
    <>
        <TextInput name='prompt' multiline />
        <TextInput type='number' name='length' defaultValue={85} />
        <TextInput type='number' name='steps' defaultValue={7} />
        <SeedInput name='seed' />
        <VideoResult />
    </>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
