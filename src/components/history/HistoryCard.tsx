import {
    AudioFile,
    Download,
    EmojiEvents,
    Image,
    PushPin,
    TextSnippet,
    VideoFile,
} from '@mui/icons-material';
import {
    Badge,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Checkbox,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { formatDuration } from '../../hooks/useTaskDuration';
import { VerticalBox } from '../VerticalBox';
import { markEnum, TaskResult } from './db';
import { HistoryCardContent } from './HistoryCardContent';
import { NodeTimingsBar } from './NodeTimingsBar';
import { NodeTiming } from '../../utils/nodeTimings';
import { HistoryCardMenu } from './HistoryCardMenu';
import { LoadParamsButton } from './LoadParamsButton';
import { DeleteButton } from './DeleteButton';
import { SendResultButton } from '../controls/SendResultButton';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { useTranslate } from '../../i18n/I18nContext';
import { ArenaCardContent } from './arena/ArenaCardContent';
import { useArena } from './arena/ArenaContext';

export const HistoryCard = ({ output }: { output: TaskResult }) => {
    const tr = useTranslate();
    const { selectMode, rosterIds, toggleParticipant } = useArena();
    const isElo = output.type === 'elo';
    const inArena = !isElo && rosterIds.has(output.id);
    const avatar = (type: string) => {
        switch (type) {
            case 'gifs':
                return <VideoFile />;
            case 'text':
                return <TextSnippet />;
            case 'audio':
                return <AudioFile />;
            case 'elo':
                return <EmojiEvents />;
            case 'images':
                return <Image />;
            default:
                return <Image />;
        }
    };
    const urlList = Array.isArray(output.url) ? output.url : [output.url];
    const batchCount = output.type === 'images' && urlList.length > 1 ? urlList.length : 0;
    const firstUrl = urlList[0];
    const [displayUrl, setDisplayUrl] = useState('');
    useEffect(() => {
        const url = output.data
            ? URL.createObjectURL(
                Array.isArray(output.data) ? output.data[0] : output.data,
            )
            : '';
        setDisplayUrl(url);
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [output.data]);
    const cacheUrl = displayUrl || firstUrl;
    let dlUrl = firstUrl;
    if (!dlUrl.startsWith('http')) {
        dlUrl = 'http://127.0.0.1/' + dlUrl; //fake URL, only need it for parsing the filename
    }
    const filename = new URL(dlUrl).searchParams.get('filename') || '';
    const duration = formatDuration(output.duration / 1000);
    const timings = useMemo(() => {
        if (!output.timings) {
            return null;
        }
        try {
            return JSON.parse(output.timings) as NodeTiming[];
        } catch {
            return null;
        }
    }, [output.timings]);
    const params = JSON.parse(output.params || '');
    const tab = params.tab;
    const headerAction = isElo ? (
        <HistoryCardMenu output={output} />
    ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {selectMode ? (
                <Checkbox
                    checked={inArena}
                    onChange={() => toggleParticipant(output)}
                    size='small'
                    aria-label={tr('arena.select')}
                />
            ) : inArena ? (
                <EmojiEvents fontSize='small' sx={{ color: 'primary.main' }} />
            ) : null}
            <HistoryCardMenu output={output} />
        </Box>
    );
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
                subheader={isElo ? tr('arena.title') : tab}
                avatar={
                    batchCount > 0 ? (
                        <Badge badgeContent={batchCount} color='primary'>
                            {avatar(output.type)}
                        </Badge>
                    ) : (
                        avatar(output.type)
                    )
                }
                action={headerAction}
            />
            <CardContent sx={{ p: 0 }}>
                <VerticalBox>
                    {timings?.length ? (
                        <NodeTimingsBar timings={timings} totalMs={output.duration} />
                    ) : null}
                    {isElo ? (
                        <ArenaCardContent rec={output} />
                    ) : (
                        <HistoryCardContent
                            params={output.params}
                            type={output.type}
                            url={output.url}
                            filename={filename}
                            data={output.data}
                        />
                    )}
                </VerticalBox>
            </CardContent>
            <CardActions sx={{ justifyContent: isElo ? 'flex-end' : 'space-between' }}>
                {isElo ? (
                    <>
                        <DeleteButton id={output.id} />
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </CardActions>
        </Card>
    );
};
