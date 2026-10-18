import { Close, History } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    List,
    ListProps,
    OutlinedInput,
    Pagination,
    TextField,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Dispatch,
    SetStateAction,
    Suspense,
    lazy,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContext } from '../contexts/CompareContext';
import { CompareContextProvider } from '../contexts/CompareContextProvider';
import { FilterContext } from '../contexts/FilterContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import { SelectInputBase } from '../controls/SelectInputBase';
import { autoscrollSlotProps } from '../controls/utils';
import { SectionAccordion } from '../controls/SectionAccordion';
import { VerticalBox } from '../VerticalBox';
import { collectHistory } from '../../utils/export/domain';
import { db } from './db';
import { pkFromFilter } from './filter';
import { HistoryCard } from './HistoryCard';
import { ExportImport } from '../export/ExportImport';
import { ArenaContext } from './arena/ArenaContext';
import { ArenaContextProvider } from './arena/ArenaContextProvider';
import { ArenaMenu } from './arena/ArenaMenu';

// The diff viewer (react-diff-viewer + diff), the arena dialog, and the
// date/pinned filter fields (@mui/x-date-pickers + dayjs) are heavy and only
// needed on demand: kept out of the main chunk via dynamic import. The
// wrappers gate on the open state so the chunk is fetched only when the
// dialog is actually opened, not when the history panel is expanded.
const DiffViewer = lazy(() =>
    import('./DiffViewer').then((m) => ({ default: m.DiffViewer })),
);
const ArenaDialog = lazy(() =>
    import('./arena/ArenaDialog').then((m) => ({ default: m.ArenaDialog })),
);
const DateFilterFields = lazy(() =>
    import('./DateFilterFields').then((m) => ({
        default: m.DateFilterFields,
    })),
);

const LazyDiffViewer = () => {
    const { open } = useContext(CompareContext);
    return open ? <DiffViewer /> : null;
};

const LazyArenaDialog = () => {
    const arena = useContext(ArenaContext);
    return arena?.openArenaId != null ? <ArenaDialog /> : null;
};

const page_size = 10;

// Shorten a model id to its display name, same as ModelSelectAutocomplete:
// filename without the path prefix and the file extension.
const modelName = (id: string) =>
    id.slice(id.lastIndexOf('/') + 1, id.lastIndexOf('.'));

const HistoryPagination = ({
    page,
    setPage,
}: {
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
}) => {
    const filter = useContext(FilterContext);
    const { workflowTabGroups } = useContext(WorkflowTabsContext);
    const count =
        useLiveQuery(async () => {
            if (filter.isEmpty()) {
                return db.taskResults.count();
            }
            const pk_x = await pkFromFilter(filter, workflowTabGroups);
            return db.taskResults.where(':id').anyOf(pk_x).count();
        }, [filter, workflowTabGroups]) ?? 0;
    const pages = Math.ceil(count / page_size);
    useEffect(() => {
        if (page > pages && pages > 0) {
            setPage(pages);
        }
    }, [count, page, pages, setPage]);
    if (count <= page_size) {
        return null;
    }
    return (
        <Pagination
            count={pages}
            page={page}
            onChange={(_, p) => setPage(p)}
            showFirstButton
            showLastButton
        />
    );
};

export const HistoryPanel = ({ ...props }: ListProps) => {
    const tr = useTranslate();
    const [page, setPage] = useState(1);
    const {
        pinned,
        prompt,
        type,
        model,
        dateFrom,
        dateTo,
        group,
        tab,
        setPinned,
        setPrompt,
        setType,
        setModel,
        setDateFrom,
        setDateTo,
        setGroup,
        setTab,
        isEmpty,
    } = useContext(FilterContext);
    const { workflowTabGroups } = useContext(WorkflowTabsContext);
    const groups = useMemo(
        () => [...new Set(Object.values(workflowTabGroups))],
        [workflowTabGroups],
    );
    const tabKeys = useMemo(
        () =>
            group
                ? Object.keys(workflowTabGroups).filter(
                      (t) => workflowTabGroups[t] === group,
                  )
                : Object.keys(workflowTabGroups),
        [workflowTabGroups, group],
    );
    const modelOptions = useLiveQuery(async () => {
        // Index-only distinct query: `uniqueKeys()` makes Dexie use openKeyCursor +
        // the `nextunique` cursor direction, so it walks only the model index
        // B-tree (no record objects / Blobs loaded) and yields each distinct model
        // once. `between(undefined, undefined)` = the full index range.
        const keys = await db.taskResults
            .where('model')
            .between(undefined, undefined, true, true)
            .uniqueKeys();
        return (keys as string[]).filter((m) => !!m).sort();
    }, []);
    const modelOpts = (modelOptions ?? []).map((id) => ({
        id,
        label: modelName(id),
    }));
    const modelValue = modelOpts.find((o) => o.id === model) ?? null;
    const results = useLiveQuery(async () => {
        if (isEmpty()) {
            // return everything
            return db.taskResults
                .orderBy('timestamp')
                .reverse()
                .offset((page - 1) * page_size)
                .limit(page_size)
                .toArray();
        }
        const pk_x = await pkFromFilter(
            { prompt, pinned, type, model, dateFrom, dateTo, group, tab },
            workflowTabGroups,
        );
        return db.taskResults
            .where(':id')
            .anyOf(pk_x)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .reverse()
            .sortBy('timestamp');
    }, [
        isEmpty,
        prompt,
        pinned,
        type,
        model,
        dateFrom,
        dateTo,
        group,
        tab,
        workflowTabGroups,
        page,
    ]);
    // Export selection: respects the current filter; reports its count for the
    // confirm dialog and to disable the button when empty.
    const exportCount =
        useLiveQuery(async () => {
            if (isEmpty()) {
                return db.taskResults.count();
            }
            const pk_x = await pkFromFilter(
                { prompt, pinned, type, model, dateFrom, dateTo, group, tab },
                workflowTabGroups,
            );
            return db.taskResults.where(':id').anyOf(pk_x).count();
        }, [
            isEmpty,
            prompt,
            pinned,
            type,
            model,
            dateFrom,
            dateTo,
            group,
            tab,
            workflowTabGroups,
        ]) ?? 0;
    const collect = useCallback(
        async () => {
            if (isEmpty()) {
                return collectHistory();
            }
            const pk_x = await pkFromFilter(
                { prompt, pinned, type, model, dateFrom, dateTo, group, tab },
                workflowTabGroups,
            );
            return collectHistory(pk_x);
        },
        [
            isEmpty,
            prompt,
            pinned,
            type,
            model,
            dateFrom,
            dateTo,
            group,
            tab,
            workflowTabGroups,
        ],
    );
    const ref = useRef<HTMLElement>(null);
    return (
        <ArenaContextProvider>
            <SectionAccordion
            label='controls.history'
            lazyContent
            summaryActions={
                <>
                    <ArenaMenu />
                    <ExportImport
                        domain='history'
                        collect={collect}
                        filtered={!isEmpty()}
                        count={exportCount}
                    />
                </>
            }
            sx={{ width: { xs: '100%', sm: '75%', md: '50%' } }}
            slotProps={autoscrollSlotProps(ref)}
            detailsRef={ref}
            icon={<History sx={{ mr: 1 }} />}
            summarySx={{
                '& .MuiAccordionSummary-content': { alignItems: 'center' },
            }}
            detailsSx={{ p: { xs: 0, md: 2 } }}
        >
            <CompareContextProvider>
                    <VerticalBox>
                        <Box width='100%' display='flex' flexWrap='wrap'>
                            <OutlinedInput
                                placeholder={tr('controls.filter')}
                                size='small'
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                sx={{ ml: { xs: 1, lg: 0 }, mb: 2 }}
                                endAdornment={
                                    <Button
                                        size='small'
                                        sx={{
                                            mr: -3,
                                            backgroundColor: 'transparent',
                                        }}
                                        disableRipple
                                        onClick={() => setPrompt('')}
                                    >
                                        <Close />
                                    </Button>
                                }
                                fullWidth
                            />
                             <SelectInputBase
                                 size='small'
                                 choices={[
                                     {
                                         text: tr('controls.type_any'),
                                         value: '',
                                     },
                                     {
                                         text: tr('controls.type_video'),
                                         value: 'gifs',
                                     },
                                     {
                                         text: tr('controls.type_audio'),
                                         value: 'audio',
                                     },
                                     {
                                         text: tr('controls.type_image'),
                                         value: 'images',
                                     },
                                 ]}
                                 name='type'
                                 value={type}
                                 onChange={(e) =>
                                     setType(e.target.value as string)
                                 }
                             />
                        </Box>
                         <SectionAccordion
                             label='controls.advanced_filters'
                             lazyContent
                             sx={{ width: '100%' }}
                         >
                            <Box width='100%' display='flex' flexWrap='wrap'>
                                <Autocomplete
                                    size='small'
                                    fullWidth
                                    options={modelOpts}
                                    value={modelValue}
                                    onChange={(_, v) => setModel(v ? v.id : '')}
                                    getOptionLabel={(o) =>
                                        typeof o === 'string' ? o : o.label
                                    }
                                    sx={{ mb: 2 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={tr('controls.model')}
                                            size='small'
                                        />
                                    )}
                                />
                                <SelectInputBase
                                    size='small'
                                    name='group'
                                    value={group}
                                    onChange={(e) => {
                                        const v = e.target.value as string;
                                        setGroup(v);
                                        if (tab && v && workflowTabGroups[tab] !== v) {
                                            setTab('');
                                        }
                                    }}
                                    choices={[
                                        {
                                            text: tr('controls.group_any'),
                                            value: '',
                                        },
                                        ...groups,
                                    ]}
                                />
                                <SelectInputBase
                                    size='small'
                                    name='tab'
                                    value={tab}
                                    onChange={(e) => setTab(e.target.value as string)}
                                    choices={[
                                        {
                                            text: tr('controls.tab_any'),
                                            value: '',
                                        },
                                        ...tabKeys,
                                    ]}
                                />
                                <Suspense fallback={null}>
                                    <DateFilterFields
                                        dateFrom={dateFrom}
                                        dateTo={dateTo}
                                        pinned={pinned}
                                        setDateFrom={setDateFrom}
                                        setDateTo={setDateTo}
                                        setPinned={setPinned}
                                    />
                                </Suspense>
                            </Box>
                        </SectionAccordion>
                        <HistoryPagination page={page} setPage={setPage} />
                        <List
                            sx={{
                                width: '100%',
                                p: 0,
                            }}
                            {...props}
                        >
                            {!results?.length && (
                                <Typography
                                    variant='body1'
                                    align='center'
                                    sx={{ mb: 2 }}
                                >
                                    {tr('controls.history_empty')}
                                </Typography>
                            )}
                            {results?.map((r) => {
                                return <HistoryCard output={r} key={r.id} />;
                            })}
                        </List>
                        <HistoryPagination page={page} setPage={setPage} />
                        <Suspense fallback={null}>
                            <LazyDiffViewer />
                        </Suspense>
                    </VerticalBox>
                    <Suspense fallback={null}>
                        <LazyArenaDialog />
                    </Suspense>
                </CompareContextProvider>
            </SectionAccordion>
        </ArenaContextProvider>
    );
};
