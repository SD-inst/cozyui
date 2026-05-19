import {
    AudioFile,
    Download,
    Image,
    PushPin,
    TextSnippet,
    VideoFile,
} from '@mui/icons-material';
import {
    Badge,
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
import { useTranslate } from '../../i18n/I18nContext';

export const HistoryCard = ({ output }: { output: TaskResult }) => {
    const cache = useRef('');
    const tr = useTranslate();
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
    const urlList = Array.isArray(output.url) ? output.url : [output.url];
    const batchCount = output.type === 'images' && urlList.length > 1 ? urlList.length : 0;
    const firstUrl = urlList[0];
    const hasData = !!output.data;
    const displayUrl = hasData
        ? URL.createObjectURL(Array.isArray(output.data) ? output.data[0] : output.data!)
        : firstUrl;
    const cacheUrl = cache.current || displayUrl;
    cache.current = cacheUrl;
    let dlUrl = firstUrl;
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
                avatar={
                    batchCount > 0 ? (
                        <Badge badgeContent={batchCount} color='primary'>
                            {avatar(output.type)}
                        </Badge>
                    ) : (
                        avatar(output.type)
                    )
                }
                action={<HistoryCardMenu output={output} />}
            />
            <CardContent sx={{ p: 0 }}>
                <VerticalBox>
                    <HistoryCardContent
                        params={output.params}
                        type={output.type}
                        url={output.url}
                        filename={filename}
                        data={output.data}
                    />
                </VerticalBox>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
                <a download={filename} href={cacheUrl}>
                    <Button variant='outlined' color='success' size='small' aria-label={tr('controls.download')}>
                        <Download />
                    </Button>
                </a>
                <ResultOverrideContextProvider
                    value={{
                        id: 'history',
                        type: output.type,
                        url: cacheUrl,
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
