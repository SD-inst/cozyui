import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../redux/hooks';
import { statusEnum } from '../redux/progress';

export const formatDuration = (dur: number) => {
    const minutes = Math.floor(dur / 60);
    const seconds = Math.floor(dur % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
};

export const useTaskDuration = () => {
    const [duration, setDuration] = useState('');
    const { start_ts, end_ts } = useAppSelector((s) => s.progress);
    const updateDuration = useCallback((start: number, end: number) => {
        const dur = (end - start) / 1000;
        setDuration(formatDuration(dur));
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

export const useTaskEta = () => {
    const [currentNodeStartTs, setCurrentNodeStartTs] = useState(0);
    const [eta, setEta] = useState(0);
    const { status, value, min, max, current_node } = useAppSelector(
        (s) => s.progress
    );
    const lastNode = useRef('');
    useEffect(() => {
        if (status !== statusEnum.RUNNING) {
            lastNode.current = '';
            setEta(0);
            return;
        }
        if (lastNode.current !== current_node) {
            lastNode.current = current_node;
            setCurrentNodeStartTs(new Date().getTime());
        }
        if (lastNode.current === current_node && value - min > 0) {
            const passed = new Date().getTime() - currentNodeStartTs;
            setEta((passed * (max - value)) / (value - min));
        }
    }, [currentNodeStartTs, current_node, max, min, status, value]);
    if (eta > 0) {
        return formatDuration(eta / 1000);
    } else {
        return '';
    }
};
