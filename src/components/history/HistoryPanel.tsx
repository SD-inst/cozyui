import { ExpandMore, History } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    List,
    ListProps,
    Pagination,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { HistoryCard } from './HistoryCard';
import { Dispatch, SetStateAction, useState } from 'react';

const page_size = 10;

const HistoryPagination = ({
    page,
    setPage,
}: {
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
}) => {
    const count = useLiveQuery(() => db.taskResults.count()) ?? 0;
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
    const [page, setPage] = useState(1);
    const results = useLiveQuery(
        () =>
            db.taskResults
                .orderBy('timestamp')
                .reverse()
                .offset((page - 1) * page_size)
                .limit(page_size)
                .toArray(),
        [page, page_size]
    );
    return (
        <Accordion sx={{ width: { xs: '100%', sm: '75%', md: '50%' } }}>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
            >
                <History sx={{ mr: 1 }} />
                History
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 0, md: 2 } }}>
                <VerticalBox>
                    <HistoryPagination page={page} setPage={setPage} />
                    <List
                        sx={{
                            width: '100%',
                            p: 0,
                        }}
                        {...props}
                    >
                        {!results?.length && (
                            <Typography variant='body1'>Nothing yet</Typography>
                        )}
                        {results?.map((r) => (
                            <HistoryCard
                                output={r}
                                key={r.url + r.timestamp + r.duration}
                            />
                        ))}
                    </List>
                    <HistoryPagination page={page} setPage={setPage} />
                </VerticalBox>
            </AccordionDetails>
        </Accordion>
    );
};
