import { FilterType } from '../contexts/filterType';
import { db, markEnum } from './db';

export const pkFromFilter = async (filter: FilterType) => {
    const filter_words = filter.prompt.split(' ').map((w) => w.toLowerCase());
    const pks = await Promise.all(
        filter_words.map((w) => {
            if (w) {
                return db.taskResults
                    .where('words')
                    .startsWith(w)
                    .filter((t) =>
                        filter.pinned ? t.mark === markEnum.PINNED : true
                    )
                    .primaryKeys();
            } else {
                return db.taskResults
                    .where('mark')
                    .equals(markEnum.PINNED)
                    .primaryKeys();
            }
        })
    );
    const pk_x = pks.reduce((a, b) => {
        const set = new Set(b);
        return a.filter((pk) => set.has(pk));
    });
    return pk_x;
};
