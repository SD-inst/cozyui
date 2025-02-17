import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { AudioResult } from '../controls/AudioResult';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { WFTab } from '../WFTab';
import { CFGInput } from '../controls/CFGInput';
import { useTranslate } from '../../i18n/I18nContext';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <SliderInput
                    min={1}
                    max={120}
                    step={0.1}
                    name='length'
                    defaultValue={47}
                />
                <SliderInput
                    name='steps'
                    defaultValue={200}
                    min={1}
                    max={300}
                />
                <CFGInput />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextInput
                            name='neg_prompt'
                            defaultValue='low quality'
                            multiline
                            sx={{ mb: 2 }}
                        />
                        <SamplerSelectInput
                            name='sampler'
                            defaultValue='dpmpp_3m_sde'
                        />
                        <SchedulerSelectInput name='scheduler' />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <AudioResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const StableAudioTab = (
    <WFTab label='Stable audio' value='Stable audio' content={<Content />} />
);
