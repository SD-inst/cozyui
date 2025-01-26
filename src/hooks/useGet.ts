import { StaleTime, useQuery } from '@tanstack/react-query';

export const useGet = ({
    url,
    enabled,
    staleTime,
}: {
    url: string;
    enabled?: boolean;
    staleTime?: StaleTime<any>;
}) => {
    return useQuery({
        enabled,
        queryKey: [url],
        staleTime,
        queryFn: (ctx) =>
            fetch(url, {
                signal: ctx.signal,
                headers: { 'Cache-Control': 'no-cache' },
            }).then((r) => r.json()),
    });
};
