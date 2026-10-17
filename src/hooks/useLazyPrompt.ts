import { useEffect, useState } from 'react';

/**
 * A system prompt that can be resolved lazily via a dynamic import, so each
 * prompt module becomes its own chunk instead of bloating the main bundle.
 * Loader functions must be stable (module-level constants) to avoid refetching.
 */
export type lazyPromptType = string | (() => Promise<string>);

export const useLazyPrompt = (prompt?: lazyPromptType): string | undefined => {
    const [value, setValue] = useState<string>();

    useEffect(() => {
        if (prompt === undefined) {
            return;
        }
        if (typeof prompt === 'string') {
            setValue(prompt);
            return;
        }
        let cancelled = false;
        prompt().then((v) => {
            if (!cancelled) {
                setValue(v);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [prompt]);

    return value;
};
