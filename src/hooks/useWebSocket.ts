import { useCallback, useEffect, useRef, useState } from 'react';

export const useWebSocket = (
    url: string,
    onMessage?: (ev: MessageEvent) => any,
    onOpen?: (ev: Event) => any,
    onClose?: () => any,
    enabled?: boolean
) => {
    const [socket, setSocket] = useState<WebSocket>();
    const s = useRef<WebSocket>();
    const last_state = useRef(false);
    const reconnectTimeout = useRef<number>();
    const initSocket = useCallback(
        (url: string) => {
            s.current = new WebSocket(
                new URL(url, location.href).href.replace(/^http/, 'ws')
            );
            s.current.binaryType = 'arraybuffer';
            s.current.onclose = () => {
                if (onClose && last_state.current) {
                    // only call onClose once until we reconnect
                    onClose();
                }
                last_state.current = false;
                reconnectTimeout.current = window.setTimeout(() => {
                    initSocket(url);
                }, 1000);
            };
            if (onMessage) {
                s.current.onmessage = onMessage;
            }
            s.current.onopen = (e) => {
                last_state.current = true;
                if (onOpen) {
                    onOpen(e);
                }
            };
            setSocket(s.current);
        },
        [onClose, onMessage, onOpen]
    );
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
