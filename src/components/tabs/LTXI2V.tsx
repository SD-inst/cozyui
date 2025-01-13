import { Paper } from '@mui/material';
import { TextInput } from '../controls/TextInput';
import { WFTab } from '../WFTab';

const Content = () => (
    <Paper>
        <TextInput name='prompt' multiline />
    </Paper>
);

export const LTXI2VTab = (
    <WFTab label='LTX I2V' value='LTX I2V' content={<Content />} />
);
