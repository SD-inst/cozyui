import { AudioFile, Download, Image, TextSnippet, VideoFile } from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
} from '@mui/material';
import { useRef } from 'react';
import { useIsPhone } from '../../hooks/useIsPhone';
import { formatDuration } from '../../hooks/useTaskDuration';
import { VerticalBox } from '../VerticalBox';
import { TaskResult } from './db';
import { DeleteButton } from './DeleteButton';
import { HistoryCardMenu } from './HistoryCardMenu';
import { LoadParamsButton } from './LoadParamsButton';

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
    const filename = new URL(dlUrl).searchParams.get('filename');
    const duration = formatDuration(output.duration / 1000);
    const params = JSON.parse(output.params || '');
    const tab = params.tab;
    const phone = useIsPhone();
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
                    new Date(output.timestamp).toLocaleString() +
                    ` [${duration}]`
                }
                subheader={tab}
                avatar={avatar(output.type)}
                action={<HistoryCardMenu id={output.id} />}
            />
            <CardContent sx={{ p: 0 }}>
                <VerticalBox>
                    <video
                        style={{ width: phone ? '100%' : undefined }}
                        src={url}
                        controls
                        loop
                    />
                </VerticalBox>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
                <a download={filename} href={url}>
                    <Button variant='outlined' color='success' size='small'>
                        <Download />
                    </Button>
                </a>
                <LoadParamsButton params={output.params} />
                <DeleteButton id={output.id} />
            </CardActions>
        </Card>
    );
};
