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
import { Dispatch, SetStateAction, useState } from 'react';
import { CompareContextProvider } from '../contexts/CompareContextProvider';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { DiffViewer } from './DiffViewer';
import { HistoryCard } from './HistoryCard';

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
                <CompareContextProvider>
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
                                <Typography variant='body1' align='center'>
                                    Nothing yet
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
            </AccordionDetails>
        </Accordion>
    );
};
