import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../redux/hooks';

export const useTaskDuration = () => {
    const [duration, setDuration] = useState('');
    const { start_ts, end_ts } = useAppSelector((s) => s.progress);
    const updateDuration = useCallback((start: number, end: number) => {
        const dur = (end - start) / 1000;
        const minutes = Math.floor(dur / 60);
        const seconds = Math.floor(dur % 60);
        setDuration(
            `${minutes.toString().padStart(2, '0')}:${seconds
                .toString()
                .padStart(2, '0')}`
        );
    }, []);
    useEffect(() => {
        if (!start_ts) {
            setDuration('');
            return;
        }
        if (start_ts && end_ts) {
            updateDuration(start_ts, end_ts);
            return;
        }
        const i = setInterval(
            () => updateDuration(start_ts, new Date().getTime()),
            1000
        );
        return () => clearInterval(i);
    }, [start_ts, end_ts, updateDuration]);
    if (!start_ts && !end_ts) {
        return '';
    }
    return duration;
};
