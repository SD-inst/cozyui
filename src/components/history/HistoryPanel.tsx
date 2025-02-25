import { ExpandMore, History } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    List,
    ListProps,
    Pagination,
    TextField,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dispatch, SetStateAction, useContext, useRef, useState } from 'react';
import { CompareContextProvider } from '../contexts/CompareContextProvider';
import { autoscrollSlotProps } from '../controls/utils';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { DiffViewer } from './DiffViewer';
import { HistoryCard } from './HistoryCard';
import { useTranslate } from '../../i18n/I18nContext';
import { FilterContext } from '../contexts/FilterContext';
import { pkFromFilter } from './filter';

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
            if (!filter) {
                return db.taskResults.count();
            }
            const pk_x = await pkFromFilter(filter);
            return db.taskResults.where(':id').anyOf(pk_x).count();
        }, [filter]) ?? 0;
    if (count <= page_size) {
        return null;
    }
    return (
        <Pagination
            count={Math.ceil(count / page_size)}
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
    const [filter, setFilter] = useState('');
    const results = useLiveQuery(async () => {
        if (!filter) {
            // return everything
            return db.taskResults
                .orderBy('timestamp')
                .reverse()
                .offset((page - 1) * page_size)
                .limit(page_size)
                .toArray();
        }
        const pk_x = await pkFromFilter(filter);
        return db.taskResults
            .where(':id')
            .anyOf(pk_x)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .reverse()
            .sortBy('timestamp');
    }, [page, page_size, filter]);
    const ref = useRef<HTMLElement>(null);
    return (
        <Accordion
            slotProps={autoscrollSlotProps(ref)}
            sx={{ width: { xs: '100%', sm: '75%', md: '50%' } }}
        >
            <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
            >
                <History sx={{ mr: 1 }} />
                {tr('controls.history')}
            </AccordionSummary>
            <AccordionDetails ref={ref} sx={{ p: { xs: 0, md: 2 } }}>
                <CompareContextProvider>
                    <VerticalBox>
                        <Box width='100%' display='flex'>
                            <TextField
                                placeholder={tr('controls.filter')}
                                size='small'
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                sx={{ pl: 1, pr: 1 }}
                                fullWidth
                            />
                        </Box>
                        <FilterContext.Provider value={filter}>
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
                                    return (
                                        <HistoryCard output={r} key={r.id} />
                                    );
                                })}
                            </List>
                            <HistoryPagination page={page} setPage={setPage} />
                        </FilterContext.Provider>
                        <DiffViewer />
                    </VerticalBox>
                </CompareContextProvider>
            </AccordionDetails>
        </Accordion>
    );
};
