import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useApiURL } from './hooks/useApiURL';
import { useGet } from './hooks/useGet';
import { setConfig, mergeConfig } from './redux/config';
import { useAppDispatch } from './redux/hooks';
import { useTranslate, useTranslateReady } from './i18n/I18nContext';

export const ConfigLoader = () => {
    const tr = useTranslate();
    const tr_ready = useTranslateReady();
    const {
        data: dataConfig,
        error: errorConfig,
        isError: isErrorConfig,
        isSuccess: isSuccessConfig,
    } = useGet({ url: 'config.json', staleTime: Infinity });
    const {
        data: dataLocalConfig,
        error: errorLocalConfig,
        isError: isErrorLocalConfig,
        isSuccess: isSuccessLocalConfig,
    } = useGet({
        url: 'config.local.json',
        staleTime: Infinity,
        enabled: isSuccessConfig,
    });
    const apiUrl = useApiURL();
    const {
        data: dataObj,
        error: errorObj,
        isError: isErrorObj,
        isSuccess: isSuccessObj,
    } = useGet({
        url: apiUrl + '/api/object_info',
        enabled: isSuccessConfig && !!apiUrl,
        cache: true,
    });
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (isErrorConfig) {
            toast.error(
                tr('toasts.error_getting_config', { err: errorConfig })
            );
        }
        if (!isSuccessConfig || !tr_ready) {
            return;
        }
        dispatch(setConfig(dataConfig));
    }, [
        isErrorConfig,
        errorConfig,
        isSuccessConfig,
        dataConfig,
        dispatch,
        tr,
        tr_ready,
    ]);
    useEffect(() => {
        if (isErrorLocalConfig) {
            console.error('Error getting local config: ' + errorLocalConfig);
        }
        if (!isSuccessLocalConfig || !tr_ready) {
            return;
        }
        dispatch(mergeConfig(dataLocalConfig));
    }, [
        isErrorLocalConfig,
        errorLocalConfig,
        isSuccessLocalConfig,
        dataLocalConfig,
        dispatch,
        tr_ready,
    ]);
    useEffect(() => {
        if (isErrorObj) {
            toast.error(tr('toasts.error_obj_info', { err: errorObj }));
        }
        if (!isSuccessObj || !tr_ready) {
            return;
        }
        toast.success(tr('toasts.objects_updated'));
        dispatch(mergeConfig({ object_info: dataObj }));
    }, [isErrorObj, errorObj, isSuccessObj, dataObj, dispatch, tr, tr_ready]);
    return null;
};
