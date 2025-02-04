import { Download, Image, TextSnippet, VideoFile } from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
} from '@mui/material';
import { useIsPhone } from '../../hooks/useIsPhone';
import { formatDuration } from '../../hooks/useTaskDuration';
import { VerticalBox } from '../VerticalBox';
import { DeleteButton } from './DeleteButton';
import { LoadParamsButton } from './LoadParamsButton';
import { TaskResult } from './db';

export const HistoryCard = ({ output }: { output: TaskResult }) => {
    const avatar = (type: string) => {
        switch (type) {
            case 'gifs':
                return <VideoFile />;
            case 'text':
                return <TextSnippet />;
            default:
                return <Image />;
        }
    };
    const url = output.data ? URL.createObjectURL(output.data) : output.url;
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
