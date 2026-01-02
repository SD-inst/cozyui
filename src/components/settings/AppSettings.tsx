import { ExpandMore, Settings } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { useContext, useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useBooleanSetting } from '../../hooks/useSetting';
import { useTranslate } from '../../i18n/I18nContext';
import { autoscrollSlotProps } from '../controls/utils';
import { ClearHistoryButton } from '../history/ClearHistoryButton';
import { LanguageSelect } from './LanguageSelect';
import { NotificationSetting } from './NotificationSetting';
import { SettingCheckbox } from './SettingCheckbox';
import { ImportExport } from '../history/ImportExport';
import { Version } from './Version';
import { HiddenTabs } from './HiddenTabs';
import { SettingNumber } from './SettingNumber';
import { SettingMultichoice } from './SettingMultichoice';
import {
    WorkflowTabsContext,
    useFilteredTabs,
} from '../contexts/WorkflowTabsContext';

export const AppSettings = () => {
    const tr = useTranslate();
    const save_history = useBooleanSetting(settings.save_history);
    const tag_enabled = useBooleanSetting(settings.tag_completion);
    const { workflowTabs } = useContext(WorkflowTabsContext);
    const T2Itabs = useFilteredTabs('T2I');
    const ref = useRef<HTMLElement>(null);
    return (
        <Accordion slotProps={autoscrollSlotProps(ref)}>
            <AccordionSummary
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
                expandIcon={<ExpandMore />}
            >
                <Settings sx={{ mr: 1 }} />
                {tr('controls.settings')}
            </AccordionSummary>
            <AccordionDetails
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                ref={ref}
            >
                <Box display='flex' flexWrap='wrap' gap={1}>
                    <SettingCheckbox name={settings.save_history} />
                    <SettingCheckbox
                        name={settings.save_outputs_locally}
                        disabled={!save_history}
                    />
                    <SettingCheckbox name={settings.disable_help} />
                    <SettingCheckbox name={settings.enable_previews} />
                    <SettingCheckbox name={settings.tag_completion} />
                    <SettingCheckbox name={settings.backup_uploads} />
                </Box>
                {tag_enabled && (
                    <Box
                        mb={1}
                        display='flex'
                        gap={2}
                        alignItems='center'
                        flexWrap='wrap'
                    >
                        <SettingNumber
                            name={settings.tag_number}
                            defaultValue={10}
                        />
                        <SettingMultichoice
                            values={workflowTabs}
                            name={settings.tag_enabled_tabs}
                            defaultValue={T2Itabs}
                        />
                    </Box>
                )}
                <NotificationSetting />
                <LanguageSelect />
                <ClearHistoryButton sx={{ mt: 5 }} />
                <ImportExport />
                <HiddenTabs />
                <Version />
            </AccordionDetails>
        </Accordion>
    );
};
