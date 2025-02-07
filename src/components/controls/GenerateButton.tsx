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
import { useConfigTab } from '../../hooks/useConfigTab';
import { useGet } from '../../hooks/useGet';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
    clearGenerationTS,
    setStatus,
    setStatusMessage,
    statusEnum,
} from '../../redux/progress';
import { actionEnum, setApi, setParams, setPromptId } from '../../redux/tab';
import { TabContext, useCurrentTab, useHandlers } from '../contexts/TabContext';

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
    tabOverride?: string;
    text?: string;
    hideErrors?: boolean;
    noexec?: boolean;
};

export const GenerateButton = ({
    tabOverride,
    text = 'Generate',
    hideErrors,
    noexec,
}: GenerateButtonProps) => {
    const dispatch = useAppDispatch();
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
    const current_tab = useCurrentTab(tabOverride);
    const { setValue } = useContext(TabContext);
    const { api, controls } = useConfigTab(tabOverride);

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
                    toast.error(`Error processing handler of ${name}: ${e}`);
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
                    fields: [
                        ...e.fields,
                        controls[name].id + ' / ' + controls[name].field,
                    ],
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
        console.log('Generation params', params);
        dispatch(setApi(params.prompt));
        if (noexec) {
            toast.success('Execution skipped');
            dispatch(setStatus(statusEnum.FINISHED));
            return Promise.resolve();
        }
        dispatch(clearGenerationTS());
        return fetch(apiUrl + '/api/prompt', {
            method: 'POST',
            body: JSON.stringify(params),
        })
            .then(async (r) => {
                if (r.status === 200) {
                    const j = await r.json();
                    dispatch(setPromptId(j.prompt_id));
                    dispatch(
                        setParams({
                            action: actionEnum.STORE,
                            tab: current_tab,
                            values: vals,
                        })
                    );
                    return;
                }
                return r.json();
            })
            .then((j) => {
                if (j?.error?.message) {
                    toast.error(j.error.message);
                    dispatch(setPromptId(''));
                    dispatch(
                        setStatusMessage({
                            status: statusEnum.ERROR,
                            message: j.error.message,
                        })
                    );
                }
            });
    }, [
        apiData,
        apiUrl,
        client_id,
        controls,
        current_tab,
        dispatch,
        getValues,
        handlers,
        noexec,
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
        <>
            <FormControl>
                <Button
                    variant='contained'
                    color='warning'
                    onClick={() => sendPrompt()}
                    disabled={generation_disabled || !apiSuccess}
                    sx={{ mt: 1, mb: 1 }}
                >
                    {text}
                </Button>
                {!hideErrors && errors.controls.length ? (
                    <FormHelperText error>
                        Missing controls (present in API):{' '}
                        {errors.controls.join(', ')}
                    </FormHelperText>
                ) : null}
                {!hideErrors && errors.api.length ? (
                    <FormHelperText error>
                        Missing API bindings (present controls):{' '}
                        {errors.api.join(', ')}
                    </FormHelperText>
                ) : null}
                {!hideErrors && errors.ids.length ? (
                    <FormHelperText error>
                        Missing API ids: {errors.ids.join(', ')}
                    </FormHelperText>
                ) : null}
                {!hideErrors && errors.fields.length ? (
                    <FormHelperText error>
                        Missing API fields: {errors.fields.join(', ')}
                    </FormHelperText>
                ) : null}
            </FormControl>
        </>
    );
};
