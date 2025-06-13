import Papa from 'papaparse';
import { useEffect } from 'react';
import { db, Tags } from '../history/db';

export const TagLoader = () => {
    useEffect(() => {
        db.tags.count().then((c) => {
            if (c) {
                return;
            }
            Papa.parse<string[]>('tags/danbooru.csv', {
                download: true,
                complete: (r) => {
                    if (r.errors.length) {
                        console.log(r.errors);
                        return;
                    }
                    db.tags.bulkAdd(
                        r.data.map((line) => {
                            if (!line[0]) {
                                return {} as Tags;
                            }
                            const alias = line[3] ? line[3].split(',') : [];
                            const index = line[0].split('_');
                            alias.forEach((a) => {
                                a.split('_').forEach((w) => index.push(w));
                            });
                            const cleanIndex = index
                                .map((w) =>
                                    w.replace(/[^a-zA-Z0-9./+:!?-]/g, '')
                                )
                                .filter((w) => !!w);
                            const result: Tags = {
                                name: line[0],
                                color: parseInt(line[1]),
                                score: parseInt(line[2]),
                                alias,
                                index: cleanIndex.length ? cleanIndex : index,
                            };
                            return result;
                        })
                    );
                },
            });
        });
    }, []);
    return null;
};
