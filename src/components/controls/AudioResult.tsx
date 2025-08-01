import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useSaveToHistory } from '../../hooks/useSaveToHistory';
import { VerticalBox } from '../VerticalBox';
import { settings } from '../../hooks/settings';
import { useTranslate } from '../../i18n/I18nContext';
import { useStringSetting } from '../../hooks/useSetting';

export const AudioResult = ({
    title,
    noAutoplay,
    loop = true,
}: {
    title?: string;
    noAutoplay?: boolean;
    loop?: boolean;
}) => {
    const tr = useTranslate();
    const results = useResult();
    const audioRef = useRef<HTMLAudioElement>(null);
    const apiUrl = useApiURL();
    useEffect(() => {
        if (results.length && audioRef.current) {
            audioRef.current?.scrollIntoView();
        }
    }, [results]);
    const notification_sound = useStringSetting(
        settings.notification_sound,
        'None'
    );
    useEffect(() => {
        if (!results.length || noAutoplay) {
            return;
        }
        if (notification_sound !== 'None') {
            audioRef.current?.pause();
            setTimeout(() => audioRef.current?.play(), 5000);
        } else {
            audioRef.current?.play();
        }
    }, [noAutoplay, notification_sound, results]);
    useSaveToHistory();
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>
                {title || tr('controls.audio')}
            </Typography>
            {results?.map((r: any) => {
                const url = makeOutputUrl(apiUrl, r);
                return (
                    <VerticalBox key={r.filename} width='100%'>
                        <audio
                            ref={audioRef}
                            style={{ width: '100%' }}
                            src={url}
                            controls
                            loop={loop}
                        />
                        <a download href={url}>
                            <Button variant='contained' color='success'>
                                {tr('controls.download')}
                            </Button>
                        </a>
                    </VerticalBox>
                );
            })}
        </VerticalBox>
    );
};
