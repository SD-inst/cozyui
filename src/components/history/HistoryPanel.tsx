import { Close, History } from '@mui/icons-material';
import {
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
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContextProvider } from '../contexts/CompareContextProvider';
import { FilterContext } from '../contexts/FilterContext';
import { SelectInputBase } from '../controls/SelectInputBase';
import { autoscrollSlotProps } from '../controls/utils';
import { SectionAccordion } from '../controls/SectionAccordion';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { DiffViewer } from './DiffViewer';
import { pkFromFilter } from './filter';
import { HistoryCard } from './HistoryCard';

const page_size = 10;

const HistoryPagination = ({
    page,
    setPage,
}: {
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
}) => {
    const filter = useContext(FilterContext);
    const count =
        useLiveQuery(async () => {
            if (filter.isEmpty()) {
                return db.taskResults.count();
            }
            const pk_x = await pkFromFilter(filter);
            return db.taskResults.where(':id').anyOf(pk_x).count();
        }, [filter]) ?? 0;
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
        setPinned,
        setPrompt,
        setType,
        setModel,
        setDateFrom,
        setDateTo,
        isEmpty,
    } = useContext(FilterContext);
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
        const pk_x = await pkFromFilter({ prompt, pinned, type, model, dateFrom, dateTo });
        return db.taskResults
            .where(':id')
            .anyOf(pk_x)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .reverse()
            .sortBy('timestamp');
    }, [isEmpty, prompt, pinned, type, model, dateFrom, dateTo, page]);
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
                             <SelectInputBase
                                 size='small'
                                 choices={[
                                     {
                                         text: tr('controls.model_any'),
                                         value: '',
                                     },
                                     ...(modelOptions ?? []).map((m) => ({
                                         text: m,
                                         value: m,
                                     })),
                                 ]}
                                 name='model'
                                 value={model}
                                 onChange={(e) =>
                                     setModel(e.target.value as string)
                                 }
                             />
                             <TextField
                                 type='date'
                                 size='small'
                                 label={tr('controls.date_from')}
                                 value={dateFrom}
                                 onChange={(e) => setDateFrom(e.target.value)}
                                 slotProps={{ inputLabel: { shrink: true } }}
                                 sx={{ width: 150, mr: 1, mb: 2 }}
                             />
                             <TextField
                                 type='date'
                                 size='small'
                                 label={tr('controls.date_to')}
                                 value={dateTo}
                                 onChange={(e) => setDateTo(e.target.value)}
                                 slotProps={{ inputLabel: { shrink: true } }}
                                 sx={{ width: 150, mb: 2 }}
                             />
                             <FormControlLabel
                                 label={tr('controls.pinned')}
                                 control={
                                     <Checkbox
                                         checked={pinned}
                                         onChange={(_, c) => setPinned(c)}
                                     />
                                 }
                                 sx={{ ml: -1, mr: 2 }}
                             />
                        </Box>
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
