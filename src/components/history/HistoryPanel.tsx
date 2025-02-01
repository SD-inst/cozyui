import { ExpandMore, History } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    List,
    ListProps,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { VerticalBox } from '../VerticalBox';
import { db } from './db';
import { HistoryCard } from './HistoryCard';

export const HistoryPanel = ({ ...props }: ListProps) => {
    const results = useLiveQuery(() =>
        db.taskResults.orderBy('timestamp').reverse().toArray()
    );
    return (
        <Accordion sx={{ width: '100%' }}>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
            >
                <History sx={{ mr: 1 }} />
                History
            </AccordionSummary>
            <AccordionDetails>
                <VerticalBox>
                    <List {...props}>
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
                </VerticalBox>
            </AccordionDetails>
        </Accordion>
    );
};
