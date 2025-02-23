import { MenuItem, SelectChangeEvent } from '@mui/material';
import { useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useTranslate } from '../../i18n/I18nContext';
import { SettingSelect } from './SettingSelect';

export const NotificationSetting = () => {
    const tr = useTranslate();
    const audio = useRef<HTMLAudioElement>(null);
    const handleChange = (e: SelectChangeEvent<string>): void => {
        const sound = e.target.value;
        if (sound === 'None' || !audio.current) {
            return;
        }
        audio.current.src = `audio/${sound}`;
        audio.current.play();
    };

    return (
        <>
            <SettingSelect
                setting={settings.notification_sound}
                defaultValue='None'
                label='settings.notification'
                size='small'
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
            </SettingSelect>
            <audio ref={audio} />
        </>
    );
};
