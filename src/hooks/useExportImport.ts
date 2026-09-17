import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslate } from '../i18n/I18nContext';
import { buildArchive, readArchive } from '../utils/export/archive';
import { restore } from '../utils/export/domain';
import {
    EXPORT_FORMAT,
    EXPORT_VERSION,
    Domain,
    Manifest,
    RawRecord,
    hoistBlobs,
} from '../utils/export/format';

const download = (blob: Blob, name: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

// Shared export/import logic. `doExport` runs collect → hoist → zip → download;
// `doImport` reads a zip and restores it. Both report progress and honor an
// interrupt flag. `quiet` (single-item export) skips the progress UI.
export const useExportImport = () => {
    const tr = useTranslate();
    const [progress, setProgress] = useState(0);
    const interrupt = useRef(false);
    const interrupted = useCallback(
        () => new Error(tr('errors.interrupted')),
        [tr],
    );

    const doExport = useCallback(
        async (
            domain: Domain,
            collect: () => Promise<RawRecord[]>,
            opts?: { quiet?: boolean; name?: string },
        ) => {
            interrupt.current = false;
            const quiet = opts?.quiet;
            if (!quiet) {
                setProgress(0);
            }
            try {
                const records = await collect();
                const { records: hoisted, files } = await hoistBlobs(
                    records,
                    (done, total) => {
                        if (interrupt.current) {
                            throw interrupted();
                        }
                        if (!quiet) {
                            setProgress(Math.round((done / total) * 50));
                        }
                    },
                );
                if (interrupt.current) {
                    return;
                }
                const manifest: Manifest = {
                    format: EXPORT_FORMAT,
                    version: EXPORT_VERSION,
                    created: Date.now(),
                    domain,
                    count: records.length,
                    records: hoisted,
                    files: [...files.values()].map(
                        ({ id, filename, type, size }) => ({
                            id,
                            filename,
                            type,
                            size,
                        }),
                    ),
                };
                const blob = await buildArchive(manifest, files, (done, total) => {
                    if (interrupt.current) {
                        throw interrupted();
                    }
                    if (!quiet) {
                        setProgress(50 + Math.round((done / total) * 50));
                    }
                });
                if (interrupt.current) {
                    return;
                }
                download(blob, opts?.name ?? `${domain}.zip`);
                toast.success(tr('export.exported', { n: records.length }));
            } catch (e) {
                if (!interrupt.current) {
                    toast.error(tr('toasts.error_exporting', { err: String(e) }));
                    console.error(e);
                }
            } finally {
                if (!quiet) {
                    setProgress(0);
                }
            }
        },
        [tr, interrupted],
    );

    const doImport = useCallback(
        async (file: File, domain: Domain) => {
            interrupt.current = false;
            setProgress(0);
            try {
                const { manifest, files } = await readArchive(file, (done, total) => {
                    if (interrupt.current) {
                        throw interrupted();
                    }
                    setProgress(Math.round((done / total) * 50));
                });
                if (manifest.domain !== domain) {
                    toast.error(
                        tr('toasts.import_domain_mismatch', {
                            got: manifest.domain,
                            want: domain,
                        }),
                    );
                    return;
                }
                await restore(
                    { manifest, records: manifest.records, files },
                    (done, total) => {
                        if (interrupt.current) {
                            throw interrupted();
                        }
                        setProgress(50 + Math.round((done / total) * 50));
                    },
                );
                toast.success(tr('import.imported', { n: manifest.count }));
            } catch (e) {
                if (!interrupt.current) {
                    toast.error(tr('toasts.error_importing', { err: String(e) }));
                    console.error(e);
                }
            } finally {
                setProgress(0);
            }
        },
        [tr, interrupted],
    );

    return { progress, interrupt, doExport, doImport };
};
