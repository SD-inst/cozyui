import { History } from '@mui/icons-material';
import { List, Typography } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { SectionAccordion } from '../controls/SectionAccordion';
import { autoscrollSlotProps } from '../controls/utils';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { useTranslate } from '../../i18n/I18nContext';
import { db, Session } from '../history/db';
import { SessionCard } from './SessionCard';

// Global accordion listing the current tab's sessions (restore / rename /
// delete). Creation lives in the tab's GridBottom (SaveSessionButton).
export const SessionsPanel = () => {
    const tr = useTranslate();
    const currentTab = useCurrentTab();
    const sessions =
        useLiveQuery(async (): Promise<Session[]> => {
            if (!currentTab) {
                return [];
            }
            const all = await db.sessions
                .where('tab')
                .equals(currentTab)
                .toArray();
            return [...all].sort((a, b) => b.timestamp - a.timestamp);
        }, [currentTab]) ?? [];
    const ref = useRef<HTMLElement>(null);
    return (
        <SectionAccordion
            label='sessions.title'
            sx={{ width: { xs: '100%', sm: '75%', md: '50%' } }}
            slotProps={autoscrollSlotProps(ref)}
            detailsRef={ref}
            icon={<History sx={{ mr: 1 }} />}
            summarySx={{
                '& .MuiAccordionSummary-content': { alignItems: 'center' },
            }}
            detailsSx={{ p: { xs: 0, md: 2 } }}
        >
            <List sx={{ width: '100%', p: 0 }}>
                {!sessions.length && (
                    <Typography
                        variant='body1'
                        align='center'
                        sx={{ mb: 2 }}
                    >
                        {tr('sessions.empty')}
                    </Typography>
                )}
                {sessions.map((s) => (
                    <SessionCard session={s} key={s.id} />
                ))}
            </List>
        </SectionAccordion>
    );
};
