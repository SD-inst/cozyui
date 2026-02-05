import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useTabVisibility } from '../../hooks/useTabVisibility';
import { useTranslate } from '../../i18n/I18nContext';
import { db } from '../history/db';

export const HiddenTabs = ({ ...props }) => {
    const { allVisibleTabs, userFilteredTabs } = useTabVisibility();
    const tr = useTranslate();
    return (
        <Box>
            <Typography variant='h6'>{tr('controls.tabs')}</Typography>
            <Box display='flex' flexWrap='wrap' {...props}>
                {allVisibleTabs &&
                    allVisibleTabs.map((v) => (
                        <FormControlLabel
                            key={v}
                            control={<Checkbox />}
                            label={v}
                            checked={userFilteredTabs.includes(v)}
                            onChange={(_, c) => {
                                const hiddenTabs = allVisibleTabs.filter(
                                    (t) =>
                                        (t !== v &&
                                            !userFilteredTabs.includes(t)) ||
                                        (t === v && !c),
                                );
                                db.settings.put({
                                    name: settings.hidden_tabs,
                                    value: JSON.stringify(hiddenTabs),
                                });
                            }}
                        />
                    ))}
            </Box>
        </Box>
    );
};
