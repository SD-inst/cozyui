import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Tags, db } from '../components/history/db';

const MAX_TAGS = 10;

export const useTagsController = () => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(0);
    const [tag, setTag] = useState<string>('');
    const [tags, setTags] = useState<Tags[]>([]);
    const tagRC = useRef<string>('');
    useLiveQuery(async () => {
        if (!tag) {
            return;
        }
        tagRC.current = tag;
        const words = tag.split('_').filter((w) => !!w);
        const dbtags = await Promise.all(
            words.map((w) =>
                db.tags.where('index').startsWith(w).distinct().sortBy('score')
            )
        );
        if (tagRC.current !== tag) {
            // discard everything, tag has changed
            return;
        }
        if (words.length === 1) { // one word fast path
            setTags(dbtags[0].reverse().slice(0, MAX_TAGS));
        }
        const names = dbtags
            .map((ta) => ta.map((t) => t.name))
            .reduce((a, b) => {
                const set = new Set(b);
                return a.filter((t) => set.has(t));
            });
        const dbtagsDeduped = await db.tags
            .where('name')
            .anyOf(names)
            .sortBy('score');
        if (tagRC.current !== tag) {
            // discard everything, tag has changed
            return;
        }
        setTags(dbtagsDeduped.reverse().slice(0, MAX_TAGS));
    }, [tag]);
    const move = (inc: number) => {
        setPos((p) => (p + inc + tags.length) % tags.length);
    };
    return {
        open,
        setOpen: (o: boolean) => {
            setOpen(o);
            if (!o) {
                setPos(0);
            }
        },
        pos,
        setPos,
        move,
        tags,
        setTag,
        currentTag: tags[pos],
    };
};
