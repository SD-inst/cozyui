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

export const NotificationSetting = () => {
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
            <FormControl sx={{ width: 200 }}>
                <InputLabel>Notification</InputLabel>
                <Select
                    label='Notification'
                    size='small'
                    value={sound}
                    onChange={handleChange}
                >
                    <MenuItem value='None'>None</MenuItem>
                    {new Array(5).fill(undefined).map((_, i) => (
                        <MenuItem key={i} value={`${i + 1}.mp3`}>
                            Sound effect #{i + 1}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <audio ref={audio} />
        </>
    );
};
