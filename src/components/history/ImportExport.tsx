import { Download, Upload } from '@mui/icons-material';
import {
    Backdrop,
    Box,
    Button,
    CircularProgress,
    Typography,
} from '@mui/material';
import {
    exportDB,
    ExportProgress,
    importInto,
} from '@rkfg/dexie-export-import';
import { ImportProgress } from '@rkfg/dexie-export-import/dist/import';
import { useCallback, useRef, useState } from 'react';
import { db } from './db';
import toast from 'react-hot-toast';
import { useTranslate } from '../../i18n/I18nContext';

export const ImportExport = () => {
    const tr = useTranslate();
    const [progress, setProgress] = useState(0);
    const interrupt = useRef(false);
    const progressCallback = useCallback(
        (p: ImportProgress | ExportProgress) => {
            setProgress((p.completedRows * 100) / (p.totalRows ?? 1));
            if (interrupt.current) {
                throw tr('errors.interrupted');
            }
            return false;
        },
        [tr]
    );
    const handleExport = async () => {
        interrupt.current = false;
        const blob = await exportDB(db, {
            progressCallback,
            numRowsPerChunk: 1,
            filter: (table) => table === 'taskResults',
        });
        setProgress(0);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cozydb.json';
        link.click();
    };
    const handleImport = async (file: File) => {
        interrupt.current = false;
        console.log('File picked', file);
        const last = await db.taskResults
            .orderBy('id')
            .reverse()
            .limit(1)
            .first();
        const last_id = last?.id || 0;
        importInto(db, file, {
            acceptChangedPrimaryKey: true,
            filter: (table) => table === 'taskResults',
            transform: (_table, value) => ({
                key: last_id + value.id,
                value: { ...value, id: last_id + value.id },
            }),
            progressCallback,
        })
            .catch((e) => {
                toast.error(tr('toasts.error_importing_database', { err: e }));
                console.error(e);
            })
            .finally(() => setProgress(0));
    };
    const handleInterrupt = () => {
        interrupt.current = true;
    };
    const ref = useRef<HTMLInputElement>(null);
    return (
        <Box
            display='flex'
            flexWrap='wrap'
            flexDirection='row'
            gap={1}
            width='100%'
            justifyContent='center'
            mt={2}
        >
            <Button
                variant='contained'
                color='primary'
                startIcon={<Download />}
                onClick={() => {
                    ref.current?.click();
                }}
            >
                <input
                    ref={ref}
                    type='file'
                    name='file'
                    style={{ display: 'none' }}
                    accept='application/json'
                    onChange={(e) => {
                        if (e.target.files?.length) {
                            handleImport(e.target.files[0]);
                        }
                        ref.current!.value = ''; // reset to allow picking again
                        return;
                    }}
                />
                {tr('controls.import_history')}
            </Button>
            <Button
                variant='contained'
                color='secondary'
                startIcon={<Upload />}
                onClick={handleExport}
            >
                {tr('controls.export_history')}
            </Button>
            <Backdrop open={progress > 0}>
                <Box
                    display='flex'
                    flexDirection='column'
                    gap={2}
                    alignItems='center'
                >
                    <CircularProgress
                        variant='determinate'
                        value={progress}
                        sx={{ height: 10, width: '100%' }}
                    />
                    <Typography variant='h6'>
                        {tr('controls.please_wait')}
                    </Typography>
                    <Button
                        color='error'
                        variant='outlined'
                        onClick={handleInterrupt}
                    >
                        {tr('controls.interrupt')}
                    </Button>
                </Box>
            </Backdrop>
        </Box>
    );
};
