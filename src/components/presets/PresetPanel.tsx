import { Bookmarks, Close } from '@mui/icons-material';
import {
    Box,
    Button,
    List,
    ListProps,
    OutlinedInput,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { get } from 'lodash';
import { SelectInputBase } from '../controls/SelectInputBase';
import { autoscrollSlotProps } from '../controls/utils';
import { SectionAccordion } from '../controls/SectionAccordion';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { useTranslate } from '../../i18n/I18nContext';
import { db } from '../history/db';
import { useAppSelector } from '../../redux/hooks';
import { PresetCard } from './PresetCard';
import { SavePresetButton } from './SavePresetButton';

export const PresetPanel = ({ ...props }: ListProps) => {
    const tr = useTranslate();
    const currentTab = useCurrentTab();
    const [tabFilter, setTabFilter] = useState(currentTab);
    const [search, setSearch] = useState('');
    // The filter follows the current tab; picking a tab manually in the
    // dropdown applies until the current tab switches again
    useEffect(() => {
        setTabFilter(currentTab);
    }, [currentTab]);
    const presets = useLiveQuery(async () => {
        const all = await db.presets.orderBy('timestamp').reverse().toArray();
        return all.filter(
            (p) =>
                (!tabFilter || p.tab === tabFilter) &&
                p.name.toLowerCase().includes(search.toLowerCase()),
        );
    }, [tabFilter, search]) ?? [];
    const tabs = useAppSelector((s) => get(s, ['config', 'tabs'], {})) ?? {};
    const ref = useRef<HTMLElement>(null);
    return (
        <SectionAccordion
            label='presets.title'
            sx={{ width: { xs: '100%', sm: '75%', md: '50%' } }}
            slotProps={autoscrollSlotProps(ref)}
            detailsRef={ref}
            icon={<Bookmarks sx={{ mr: 1 }} />}
            summarySx={{
                '& .MuiAccordionSummary-content': { alignItems: 'center' },
            }}
            detailsSx={{ p: { xs: 0, md: 2 } }}
        >
            <Box width='100%' display='flex' flexWrap='wrap'>
                    <OutlinedInput
                        placeholder={tr('presets.search')}
                        size='small'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ ml: { xs: 1, lg: 0 }, mb: 2 }}
                        endAdornment={
                            <Button
                                size='small'
                                sx={{
                                    mr: -3,
                                    backgroundColor: 'transparent',
                                }}
                                disableRipple
                                onClick={() => setSearch('')}
                            >
                                <Close />
                            </Button>
                        }
                        fullWidth
                    />
                    <SelectInputBase
                        size='small'
                        name='tab'
                        value={tabFilter}
                        // show the "All tabs" option when the value is empty
                        displayEmpty
                        onChange={(e) => setTabFilter(e.target.value as string)}
                        choices={[
                            {
                                text: tr('presets.all_tabs'),
                                value: '',
                            },
                            ...Object.keys(tabs).map((t) => ({
                                text: t,
                                value: t,
                            })),
                        ]}
                    />
                    <SavePresetButton />
                </Box>
                <List sx={{ width: '100%', p: 0 }} {...props}>
                    {!presets.length && (
                        <Typography
                            variant='body1'
                            align='center'
                            sx={{ mb: 2 }}
                        >
                            {tr('presets.empty')}
                        </Typography>
                    )}
                    {presets.map((p) => (
                        <PresetCard preset={p} key={p.id} />
                    ))}
                </List>
            </SectionAccordion>
    );
};
