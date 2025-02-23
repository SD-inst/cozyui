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
        queryFn: async (ctx) => {
            const headers: HeadersInit = {};
            if (!cache) {
                headers['Cache-Control'] = 'no-cache';
            }
            const r = await fetch(url, {
                signal: ctx.signal,
                headers,
            });
            if (!r.ok) {
                throw new Error(r.statusText);
            }
            return r.json();
        },
    });
};
