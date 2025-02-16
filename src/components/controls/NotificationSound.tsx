import { useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useStringSetting } from '../../hooks/useStringSetting';
import { useAppSelector } from '../../redux/hooks';
import { statusEnum } from '../../redux/progress';

export const NotificationSound = () => {
    const sound = useStringSetting(settings.notification_sound, 'None');
    const status = useAppSelector((s) => s.progress.status);
    const audio = useRef<HTMLAudioElement>(null);
    if (sound === 'None') {
        return null;
    }
    if (
        audio.current &&
        (status === statusEnum.FINISHED || status === statusEnum.ERROR)
    ) {
        audio.current.src = `audio/${sound}`;
        audio.current.play();
    }
    return <audio ref={audio} />;
};
