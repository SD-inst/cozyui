import { db } from './db';

export const pkFromFilter = async (filter: string) => {
    const filter_words = filter.split(' ').map((w) => w.toLowerCase());
    const pks = await Promise.all(
        filter_words.map((w) =>
            db.taskResults.where('words').startsWith(w).primaryKeys()
        )
    );
    const pk_x = pks.reduce((a, b) => {
        const set = new Set(b);
        return a.filter((pk) => set.has(pk));
    });
    return pk_x;
};
