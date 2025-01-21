import { useCallback, useEffect, useRef, useState } from 'react';

export const useWebSocket = (
    url: string,
    onMessage?: (ev: MessageEvent) => any,
    onOpen?: (ev: Event) => any,
    enabled?: boolean
) => {
    const [socket, setSocket] = useState<WebSocket>();
    const s = useRef<WebSocket>();
    const reconnectTimeout = useRef<number>();
    const initSocket = useCallback((url: string) => {
        s.current = new WebSocket(url);
        s.current.onclose = () => {
            reconnectTimeout.current = setTimeout(() => {
                initSocket(url);
            }, 1000);
        };
        if (onMessage) {
            s.current.onmessage = onMessage;
        }
        if (onOpen) {
            s.current.onopen = onOpen;
        }
        setSocket(s.current);
    }, [onMessage, onOpen]);
    useEffect(() => {
        if (!enabled) {
            return;
        }
        initSocket(url);
        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = undefined;
            }
            if (s.current) {
                s.current.onclose = null; // prevent restart
                s.current.close();
                s.current = undefined;
            }
        };
    }, [url, enabled, initSocket]);
    return socket;
};
