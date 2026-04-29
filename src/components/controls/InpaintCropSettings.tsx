import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { useWatch } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type InpaintCropSettingsProps = {
    name: string;
};

export const InpaintCropSettings = ({ name }: InpaintCropSettingsProps) => {
    const tr = useTranslate();
    const inpaintCropEnabled = useWatch({
        name: `${name}.inpaint_crop_enabled`,
        defaultValue: true,
    });

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {tr('controls.inpaint_crop_settings')}
            </AccordionSummary>
            <AccordionDetails>
                <ToggleInput
                    name={`${name}.inpaint_crop_enabled`}
                    label='inpaint_crop'
                    defaultValue={true}
                />
                {inpaintCropEnabled && (
                    <Box display='flex' flexDirection='column' gap={2} mt={1}>
                        <SliderInput
                            name={`${name}.mask_expand_pixels`}
                            label='mask_expand_pixels'
                            defaultValue={2}
                            min={0}
                            max={64}
                            step={1}
                        />
                        <SliderInput
                            name={`${name}.mask_blend_pixels`}
                            label='mask_blend_pixels'
                            defaultValue={32}
                            min={0}
                            max={128}
                            step={1}
                        />
                        <SliderInput
                            name={`${name}.context_expand_factor`}
                            label='context_expand_factor'
                            defaultValue={1.2}
                            min={1}
                            max={3}
                            step={0.05}
                        />
                        <Box display='flex' gap={1} flexWrap='wrap'>
                            <SliderInput
                                name={`${name}.target_width`}
                                label='target_width'
                                defaultValue={1024}
                                min={256}
                                max={2048}
                                step={64}
                                sx={{
                                    minWidth: 300,
                                    flex: 1,
                                }}
                            />
                            <SliderInput
                                name={`${name}.target_height`}
                                label='target_height'
                                defaultValue={1024}
                                min={256}
                                max={2048}
                                step={64}
                                sx={{
                                    minWidth: 300,
                                    flex: 1,
                                }}
                            />
                        </Box>
                        <SelectInput
                            name={`${name}.output_padding`}
                            label='output_padding'
                            defaultValue={'32'}
                            choices={[
                                '0',
                                '8',
                                '16',
                                '32',
                                '64',
                                '128',
                                '256',
                                '512',
                            ]}
                        />
                    </Box>
                )}
            </AccordionDetails>
        </Accordion>
    );
};
