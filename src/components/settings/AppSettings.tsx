import { Settings } from '@mui/icons-material';
import { Box } from '@mui/material';
import { useContext, useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useBooleanSetting } from '../../hooks/useSetting';
import { autoscrollSlotProps } from '../controls/utils';
import { SectionAccordion } from '../controls/SectionAccordion';
import { ClearHistoryButton } from '../history/ClearHistoryButton';
import { LanguageSelect } from './LanguageSelect';
import { LLMSettings } from './LLMSettings';
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
    const save_history = useBooleanSetting(settings.save_history);
    const tag_enabled = useBooleanSetting(settings.tag_completion);
    const { workflowTabs } = useContext(WorkflowTabsContext);
    const T2Itabs = useFilteredTabs('T2I');
    const ref = useRef<HTMLElement>(null);
    return (
        <SectionAccordion
            label='controls.settings'
            slotProps={autoscrollSlotProps(ref)}
            detailsRef={ref}
            icon={<Settings sx={{ mr: 1 }} />}
            summarySx={{
                '& .MuiAccordionSummary-content': { alignItems: 'center' },
            }}
            detailsSx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
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
                    <SettingCheckbox name={settings.chat_stream} />
                </Box>
                <LLMSettings />
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
                <Box
                    mb={1}
                    display='flex'
                    gap={2}
                    alignItems='center'
                    flexWrap='wrap'
                >
                    <SettingMultichoice
                        values={workflowTabs}
                        name={settings.activation_tags_enabled_tabs}
                        defaultValue={T2Itabs}
                    />
                </Box>
                <NotificationSetting />
                <LanguageSelect />
                <ClearHistoryButton sx={{ mt: 5 }} />
                <ImportExport />
                <HiddenTabs />
                <Version />
            </SectionAccordion>
    );
};
