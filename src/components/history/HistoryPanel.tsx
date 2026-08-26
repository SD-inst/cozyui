import { Close, History } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    List,
    ListProps,
    OutlinedInput,
    Pagination,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContextProvider } from '../contexts/CompareContextProvider';
import { FilterContext } from '../contexts/FilterContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import { SelectInputBase } from '../controls/SelectInputBase';
import { autoscrollSlotProps } from '../controls/utils';
import { SectionAccordion } from '../controls/SectionAccordion';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { DiffViewer } from './DiffViewer';
import { pkFromFilter } from './filter';
import { HistoryCard } from './HistoryCard';

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
    const ref = useRef<HTMLElement>(null);
    return (
        <SectionAccordion
            label='controls.history'
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
                        <SectionAccordion label='controls.advanced_filters'>
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
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label={tr('controls.date_from')}
                                        value={dateFrom ? dayjs(dateFrom) : null}
                                        onChange={(v) =>
                                            setDateFrom(
                                                v ? v.format('YYYY-MM-DD') : '',
                                            )
                                        }
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: { width: 170, mr: 1, mb: 2 },
                                            },
                                        }}
                                    />
                                    <DatePicker
                                        label={tr('controls.date_to')}
                                        value={dateTo ? dayjs(dateTo) : null}
                                        onChange={(v) =>
                                            setDateTo(
                                                v ? v.format('YYYY-MM-DD') : '',
                                            )
                                        }
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: { width: 170, mb: 2 },
                                            },
                                        }}
                                    />
                                </LocalizationProvider>
                                <FormControlLabel
                                    label={tr('controls.pinned')}
                                    control={
                                        <Checkbox
                                            checked={pinned}
                                            onChange={(_, c) => setPinned(c)}
                                        />
                                    }
                                    sx={{ ml: 0, mb: 2 }}
                                />
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
                        <DiffViewer />
                    </VerticalBox>
                </CompareContextProvider>
            </SectionAccordion>
    );
};
