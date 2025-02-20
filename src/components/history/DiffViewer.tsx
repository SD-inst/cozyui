import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    useTheme,
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useTranslate } from '../../i18n/I18nContext';
import { CompareContext } from '../contexts/CompareContext';

export const DiffViewer = () => {
    const [diffJsonWords, setDiffJsonWords] = useState();
    useEffect(() => {
        // https://github.com/kpdecker/jsdiff/issues/579#issuecomment-2671520352
        Promise.all([
            // @ts-expect-error I know what I'm doing
            import('diff/lib/diff/json.js'),
            // @ts-expect-error I know what I'm doing
            import('diff/lib/diff/word.js'),
        ]).then((p) => {
            p[0].jsonDiff.tokenize = p[1].wordDiff.tokenize;
            // have to wrap it in a function, otherwise React tries to call p[0].diffJson and crashes
            setDiffJsonWords(() => p[0].diffJson);
        });
    }, []);
    const tr = useTranslate();
    const { setCompare, jsonA, jsonB, open } = useContext(CompareContext);
    const handleClose = () => {
        setCompare((v) => ({ ...v, open: false }));
    };
    const {
        palette: { mode },
    } = useTheme();
    const phone = useIsPhone();
    const singleJson = !jsonA;
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            onKeyUp={(e) =>
                (e.key === 'Enter' || e.key === 'Esc') && handleClose()
            }
            maxWidth='lg'
        >
            <DialogTitle>
                {singleJson
                    ? tr('controls.generation_params')
                    : tr('controls.difference')}
            </DialogTitle>
            <DialogContent>
                {singleJson ? (
                    <ReactDiffViewer
                        newValue={jsonB}
                        useDarkTheme={mode === 'dark'}
                        splitView={false}
                        compareMethod={diffJsonWords}
                        hideLineNumbers
                        styles={
                            {
                                diffContainer: { minWidth: 200 },
                                marker: { visibility: 'hidden' },
                                summary: { display: 'none' },
                                diffAdded: { backgroundColor: 'transparent' },
                            } as any
                        } // TODO: fix temporary "as any"
                    />
                ) : (
                    <ReactDiffViewer
                        oldValue={jsonA}
                        newValue={jsonB}
                        useDarkTheme={mode === 'dark'}
                        splitView={!phone}
                        compareMethod={diffJsonWords}
                        hideLineNumbers
                        styles={{ diffContainer: { minWidth: 200 } }}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{tr('controls.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};
