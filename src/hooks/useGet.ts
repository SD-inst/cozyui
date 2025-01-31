import { StaleTime, useQuery } from '@tanstack/react-query';

export const useGet = ({
    url,
    enabled,
    staleTime = 3600000,
    cache,
}: {
    url: string;
    enabled?: boolean;
    staleTime?: StaleTime<any>;
    cache?: boolean;
}) => {
    return useQuery({
        enabled,
        queryKey: [url],
        staleTime,
        queryFn: (ctx) => {
            const headers: HeadersInit = {};
            if (!cache) {
                headers['Cache-Control'] = 'no-cache';
            }
            return fetch(url, {
                signal: ctx.signal,
                headers,
            }).then((r) => r.json());
        },
    });
};
