import { useQuery } from '@tanstack/react-query';

export const useGet = (url: string, enabled?: boolean) => {
    return useQuery({
        enabled,
        queryKey: [url],
        queryFn: (ctx) =>
            fetch(url, { signal: ctx.signal }).then((r) => r.json()),
    });
};
