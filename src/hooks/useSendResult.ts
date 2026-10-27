import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { makeOutputUrl } from '../api/utils';
import { useTranslate } from '../i18n/I18nContext';
import { useAppDispatch } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { useApiURL } from './useApiURL';
import { useResult } from './useResult';
import { cleanUploadName } from '../utils/uploadName';
import { uploadInputFile } from '../utils/uploadStore';

export const useSendResult = ({
    targetTab,
    fields,
    index = 0,
    fileField = 'image',
}: {
    targetTab?: string;
    fields?: string[];
    index?: number;
    fileField?: string;
}) => {
    const tr = useTranslate();
    const result = useResult();
    const dispatch = useAppDispatch();
    const formCtx = useFormContext();
    const getValues = formCtx?.getValues || (() => ({}));
    const apiUrl = useApiURL();
    const handleClick = async () => {
        const values = Object.fromEntries(
            Object.entries(getValues()).filter((e) => fields!.includes(e[0])),
        );
        const url = makeOutputUrl(apiUrl, result[index]);
        const blob = await fetch(url).then((b) => b.blob());
        const file = new File(
            [blob],
            cleanUploadName(result[index].filename),
            { type: blob.type },
        );
        // The copy that lands in the target tab's input folder is registered
        // locally, so the target tab can restore it if the server loses it.
        const image = await uploadInputFile(file, apiUrl, {
            tab: targetTab,
            field: fileField,
        })
            .then(({ name }) => name)
            .catch((e) => toast(tr('toasts.error_uploading', { err: e })));
        dispatch(
            setParams({
                action: actionEnum.RESTORE,
                tab: targetTab,
                values: { ...values, [fileField]: image },
            }),
        );
        dispatch(setTab(targetTab!));
    };
    if (index >= result.length || !targetTab || !fields) {
        return null;
    }
    return handleClick;
};
