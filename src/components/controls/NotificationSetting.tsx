import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
} from '@mui/material';
import { settings } from '../../hooks/settings';
import { useStringSetting } from '../../hooks/useStringSetting';
import { db } from '../history/db';
import { useRef } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export const NotificationSetting = () => {
    const tr = useTranslate();
    const sound = useStringSetting(settings.notification_sound, 'None');
    const audio = useRef<HTMLAudioElement>(null);
    const handleChange = (e: SelectChangeEvent<string>): void => {
        const sound = e.target.value;
        db.settings.put({
            name: settings.notification_sound,
            value: sound,
        });
        if (sound === 'None' || !audio.current) {
            return;
        }
        audio.current.src = `audio/${sound}`;
        audio.current.play();
    };

    return (
        <>
            <FormControl sx={{ width: 220 }}>
                <InputLabel>{tr('settings.notification')}</InputLabel>
                <Select
                    label={tr('settings.notification')}
                    size='small'
                    value={sound}
                    onChange={handleChange}
                >
                    <MenuItem value='None'>
                        {tr('settings.notification_none')}
                    </MenuItem>
                    {new Array(5).fill(undefined).map((_, i) => (
                        <MenuItem key={i} value={`${i + 1}.mp3`}>
                            {tr('settings.notification_name', {
                                number: i + 1,
                            })}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <audio ref={audio} />
        </>
    );
};
