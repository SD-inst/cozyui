import { useEffect, useState } from 'react';
import { makeOutputUrl } from '../api/utils';
import { useApiURL } from './useApiURL';
import { useResult } from './useResult';

/**
 * Read the text a generation produced as an extra result — a Preview as Text
 * node declared in the tab's `result` array with type `text` (`index` selects
 * which entry). The `executed` payload either carries the string itself or a
 * file the browser still has to fetch.
 */
export const useTextResult = (index = 1) => {
    const apiUrl = useApiURL();
    const results = useResult({ index });
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!results.length) {
                setText('');
                return;
            }
            setLoading(true);
            try {
                const r: any = results[0];
                if (typeof r === 'string') {
                    setText(r);
                } else if (r?.text != null) {
                    setText(
                        typeof r.text === 'string'
                            ? r.text
                            : JSON.stringify(r.text),
                    );
                } else if (r?.filename) {
                    const resp = await fetch(makeOutputUrl(apiUrl, r));
                    setText(await resp.text());
                } else {
                    setText('');
                }
            } catch (e) {
                console.log(e);
                setText('');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [results, apiUrl]);

    return { results, text, loading };
};
