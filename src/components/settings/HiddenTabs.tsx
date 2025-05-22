import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useContext } from 'react';
import { HiddenTabsContext } from '../contexts/HiddenTabsContext';
import { db } from '../history/db';
import { settings } from '../../hooks/settings';
import { useHiddenTabs } from '../../hooks/useHiddenTabs';
import { useTranslate } from '../../i18n/I18nContext';

export const HiddenTabs = ({ ...props }) => {
    const { workflowTabs } = useContext(HiddenTabsContext);
    const hiddenTabs = useHiddenTabs();
    const tr = useTranslate();
    return (
        <Box>
            <Typography variant='h6'>{tr('controls.tabs')}</Typography>
            <Box display='flex' flexWrap='wrap' {...props}>
                {workflowTabs &&
                    workflowTabs.map((v) => (
                        <FormControlLabel
                            key={v}
                            control={<Checkbox />}
                            label={v}
                            checked={!hiddenTabs?.includes(v)}
                            onChange={(_, c) => {
                                const updatedTabs = c
                                    ? hiddenTabs?.filter((t) => t !== v)
                                    : hiddenTabs?.concat(v);
                                db.settings.put({
                                    name: settings.hidden_tabs,
                                    value: JSON.stringify(updatedTabs),
                                });
                            }}
                        />
                    ))}
            </Box>
        </Box>
    );
};
