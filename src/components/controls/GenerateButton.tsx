import { Button, FormControl, FormHelperText } from '@mui/material';
import { cloneDeep } from 'lodash';
import {
    KeyboardEvent,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useApiURL } from '../../hooks/useApiURL';
import { useAPI } from '../../hooks/useConfigTab';
import { useGet } from '../../hooks/useGet';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
    clearGenerationTS,
    setStatus,
    setStatusMessage,
    statusEnum,
} from '../../redux/progress';
import {
    actionEnum,
    clearPrompt,
    setApi,
    setParams,
    setPrompt,
} from '../../redux/tab';
import { TabContext, useHandlers, useTabName } from '../contexts/TabContext';
import { ResetButton } from './ResetButton';

type error = {
    controls: string[];
    api: string[];
    ids: string[];
    fields: string[];
};

const noErrors = {
    controls: [],
    fields: [],
    ids: [],
    api: [],
};

export type GenerateButtonProps = {
    text?: string;
    hideErrors?: boolean;
    noexec?: boolean;
    noreset?: boolean;
};

export const GenerateButton = ({
    text = 'generate',
    hideErrors,
    noexec,
    noreset,
}: GenerateButtonProps) => {
    const dispatch = useAppDispatch();
    const tr = useTranslate();
    const client_id = useAppSelector((s) => s.config.client_id);
    const status = useAppSelector((s) => s.progress.status);
    const tabs = useAppSelector((s) => s.config.tabs);
    const connected = useAppSelector((s) => s.progress.connected);
    const generation_disabled =
        (status &&
            (status === statusEnum.WAITING || status === statusEnum.RUNNING)) ||
        tabs === undefined ||
        !connected;
    const [errors, setErrors] = useState<error>(noErrors);
    const { getValues } = useFormContext();
    const tab_name = useTabName();
    const { setValue } = useContext(TabContext);
    const { api, controls } = useAPI();

    const apiUrl = useApiURL();
    const { data: apiData, isSuccess: apiSuccess } = useGet({
        url: api,
        enabled: !!api,
    });
    const handlers = useHandlers();
    const sendPrompt = useCallback(() => {
        dispatch(setStatus(statusEnum.WAITING));
        setErrors(noErrors);

        const params = {
            client_id,
            prompt: cloneDeep(apiData),
        };

        for (const name in controls) {
            if (!controls[name].id || controls[name].id === 'skip') {
                // way to ignore unrelated controls
                continue;
            }
            const val = getValues(name);
            if (val === undefined) {
                setErrors((e) => ({
                    ...e,
                    controls: [...e.controls, name],
                }));
                continue;
            }
            if (
                controls[name].id === 'handle' &&
                handlers[name] !== undefined
            ) {
                try {
                    handlers[name](params.prompt, val); // modify api request
                } catch (e) {
                    console.log(e);
                    toast.error(
                        tr('toasts.error_processing_handler', { name, err: e })
                    );
                    dispatch(setStatus(statusEnum.ERROR));
                    return Promise.reject();
                }
                continue;
            }
            if (params.prompt[controls[name].id] === undefined) {
                setErrors((e) => ({
                    ...e,
                    ids: [...e.ids, controls[name].id],
                }));
                continue;
            }
            if (
                params.prompt[controls[name].id].inputs[
                    controls[name].field
                ] === undefined
            ) {
                setErrors((e) => ({
                    ...e,
                    fields: [...e.fields, name + ' / ' + controls[name].id],
                }));
                continue;
            }
            params.prompt[controls[name].id].inputs[controls[name].field] = val;
        }

        const vals = getValues();
        for (const k in vals) {
            if (!(k in controls)) {
                setErrors((e) => ({ ...e, api: [...e.api, k] }));
            }
        }
        console.log(
            '%cGeneration params: %O',
            'color: green; font-weight: bold; font-size: 1.5em',
            params
        );
        dispatch(setApi(params.prompt));
        if (noexec) {
            toast.success(tr('toasts.execution_skipped'));
            dispatch(setStatus(statusEnum.FINISHED));
            return Promise.resolve();
        }
        dispatch(clearGenerationTS());
        return fetch(apiUrl + '/api/prompt', {
            method: 'POST',
            body: JSON.stringify(params),
        }).then(async (r) => {
            if (r.status === 200) {
                const j = await r.json();
                dispatch(setPrompt({ prompt_id: j.prompt_id, tab_name }));
                dispatch(
                    setParams({
                        action: actionEnum.STORE,
                        tab: tab_name,
                        values: vals,
                    })
                );
                return;
            }
            const j = await r.json();
            if (j?.error?.message) {
                toast.error(j.error.message);
                dispatch(clearPrompt());
                dispatch(
                    setStatusMessage({
                        status: statusEnum.ERROR,
                        message: j.error.message,
                    })
                );
            }
        });
    }, [
        dispatch,
        client_id,
        apiData,
        getValues,
        noexec,
        apiUrl,
        controls,
        handlers,
        tr,
        tab_name,
    ]);
    const handleCtrlEnter = useCallback(
        (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                sendPrompt();
            }
        },
        [sendPrompt]
    );
    useEffect(() => {
        setValue((s) => ({
            ...s,
            handleCtrlEnter,
        }));
    }, [handleCtrlEnter, setValue]);
    return (
        <FormControl>
            <Button
                variant='contained'
                color='warning'
                onClick={() => sendPrompt()}
                disabled={generation_disabled || !apiSuccess}
                sx={{ mt: 1, mb: 1 }}
            >
                {tr(`controls.${text}`)}
            </Button>
            {!hideErrors && errors.controls.length ? (
                <FormHelperText error>
                    {tr('errors.missing_controls', {
                        list: errors.controls.join(', '),
                    })}
                </FormHelperText>
            ) : null}
            {!hideErrors && errors.api.length ? (
                <FormHelperText error>
                    {tr('errors.missing_bindings', {
                        list: errors.api.join(', '),
                    })}
                </FormHelperText>
            ) : null}
            {!hideErrors && errors.ids.length ? (
                <FormHelperText error>
                    {tr('errors.missing_ids', {
                        list: errors.ids.join(', '),
                    })}
                </FormHelperText>
            ) : null}
            {!hideErrors && errors.fields.length ? (
                <FormHelperText error>
                    {tr('errors.missing_fields', {
                        list: errors.fields.join(', '),
                    })}
                </FormHelperText>
            ) : null}
            {!noreset && <ResetButton sx={{ mt: 2 }} />}
        </FormControl>
    );
};
