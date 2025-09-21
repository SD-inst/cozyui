import {
    AudioFile,
    Download,
    Image,
    PushPin,
    TextSnippet,
    VideoFile,
} from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
} from '@mui/material';
import { useRef } from 'react';
import { formatDuration } from '../../hooks/useTaskDuration';
import { VerticalBox } from '../VerticalBox';
import { markEnum, TaskResult } from './db';
import { HistoryCardContent } from './HistoryCardContent';
import { HistoryCardMenu } from './HistoryCardMenu';
import { LoadParamsButton } from './LoadParamsButton';
import { DeleteButton } from './DeleteButton';
import { SendResultButton } from '../controls/SendResultButton';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';

export const HistoryCard = ({ output }: { output: TaskResult }) => {
    const cache = useRef('');
    const avatar = (type: string) => {
        switch (type) {
            case 'gifs':
                return <VideoFile />;
            case 'text':
                return <TextSnippet />;
            case 'audio':
                return <AudioFile />;
            case 'images':
                return <Image />;
            default:
                return <Image />;
        }
    };
    const url =
        cache.current ||
        (output.data ? URL.createObjectURL(output.data) : output.url);
    cache.current = url;
    let dlUrl = output.url;
    if (!dlUrl.startsWith('http')) {
        dlUrl = 'http://127.0.0.1/' + dlUrl; //fake URL, only need it for parsing the filename
    }
    const filename = new URL(dlUrl).searchParams.get('filename') || '';
    const duration = formatDuration(output.duration / 1000);
    const params = JSON.parse(output.params || '');
    const tab = params.tab;
    return (
        <Card
            variant='outlined'
            sx={{
                mt: 2,
            }}
            key={output.timestamp}
        >
            <CardHeader
                title={
                    <span>
                        {new Date(output.timestamp).toLocaleString() +
                            ` [${duration}]`}
                        {output.mark === markEnum.PINNED ? (
                            <PushPin
                                fontSize='small'
                                sx={{ mt: -1, ml: 1, rotate: '30deg' }}
                            />
                        ) : (
                            ''
                        )}
                    </span>
                }
                subheader={tab}
                avatar={avatar(output.type)}
                action={<HistoryCardMenu output={output} />}
            />
            <CardContent sx={{ p: 0 }}>
                <VerticalBox>
                    <HistoryCardContent
                        params={output.params}
                        type={output.type}
                        url={url}
                        filename={filename}
                    />
                </VerticalBox>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
                <a download={filename} href={url}>
                    <Button variant='outlined' color='success' size='small'>
                        <Download />
                    </Button>
                </a>
                <ResultOverrideContextProvider
                    value={{
                        id: 'history',
                        type: output.type,
                        url,
                        filename,
                    }}
                >
                    <SendResultButton icon />
                </ResultOverrideContextProvider>
                <LoadParamsButton params={output.params} />
                <DeleteButton id={output.id} />
            </CardActions>
        </Card>
    );
};
