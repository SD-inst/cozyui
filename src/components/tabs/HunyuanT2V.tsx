import { SeedInput } from '../controls/SeedInput';
import { TextInput } from '../controls/TextInput';
import { WFTab } from '../WFTab';

const Content = ({ ...props }) => (
    <>
        <TextInput name='prompt' multiline />
        <TextInput type='number' name='length' defaultValue={85} />
        <TextInput type='number' name='steps' defaultValue={7}/>
        <SeedInput name='seed' />
    </>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
