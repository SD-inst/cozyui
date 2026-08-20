import { useEventCallback } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
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
    const updateDuration = useEventCallback((start: number, end: number) => {
        const dur = (end - start) / 1000;
        setDuration(formatDuration(dur));
    });
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
    const [nodeStartTs, setNodeStartTs] = useState(0);
    const [lastValue, setLastValue] = useState(-1);
    const [lastValueTs, setLastValueTs] = useState(0);
    const [, setTick] = useState(0);
    const { status, value, min, max, current_node } = useAppSelector(
        (s) => s.progress
    );
    const lastNode = useRef('');
    useEffect(() => {
        if (status !== statusEnum.RUNNING) {
            lastNode.current = '';
            setNodeStartTs(0);
            setLastValue(-1);
            setLastValueTs(0);
            return;
        }
        if (lastNode.current !== current_node) {
            lastNode.current = current_node;
            setNodeStartTs(new Date().getTime());
            setLastValue(-1);
            setLastValueTs(0);
        }
        if (value !== lastValue && value - min > 0) {
            setLastValue(value);
            setLastValueTs(new Date().getTime());
        }
    }, [current_node, status, value, min, lastValue]);
    useEffect(() => {
        if (status !== statusEnum.RUNNING) {
            return;
        }
        const i = setInterval(() => setTick((t) => (t + 1) % 1000000), 1000);
        return () => clearInterval(i);
    }, [status]);
    if (status !== statusEnum.RUNNING) {
        return '';
    }
    if (!nodeStartTs || !lastValueTs || lastValue - min <= 0) {
        return '';
    }
    const now = new Date().getTime();
    const timePerUnit = (lastValueTs - nodeStartTs) / (lastValue - min);
    const remaining = (max - lastValue) * timePerUnit;
    const age = Math.max(0, now - lastValueTs);
    const eta = Math.max(0, remaining - age);
    if (eta <= 0) {
        return '';
    }
    return formatDuration(eta / 1000);
};
