import { AutoFixHigh } from '@mui/icons-material';
import {
    Box,
    Button,
    Fab,
    FormControl,
    FormHelperText,
    useEventCallback,
} from '@mui/material';
import { cloneDeep } from 'lodash';
import { KeyboardEvent, useContext, useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { settings } from '../../hooks/settings';
import { useAPI } from '../../hooks/useAPI';
import { useApiURL } from '../../hooks/useApiURL';
import { useElementVisibility } from '../../hooks/useElementVisibility';
import { useGet } from '../../hooks/useGet';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useBooleanSetting } from '../../hooks/useSetting';
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
import { SaveSessionButton } from '../sessions/SaveSessionButton';
import { controlType } from '../../redux/config';
import { Workflow } from '../../api/graph';
import { timedSignal } from '../../api/files';
import { ConnectionIndicator } from './ConnectionIndicator';
import { hasRegisteredField } from '../../utils/registeredFields';

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
    disabled?: boolean;
    requiredControls?: string | readonly string[];
};

const order = (c: controlType): number => {
    if (typeof c.order === 'number') {
        return c.order;
    }
    if (c.id === 'handle') {
        return 100;
    }
    return 0;
};

// A handler that awaits network work (a refmod re-upload, a mask upload, an
// image decode) can stall if the server is wedged. The per-request timeouts in
// files.ts bound most of these, but to guarantee WAITING can never stick
// forever, the awaited handler gets a coarse overall timeout as a safety net.
const HANDLER_TIMEOUT_MS = 5 * 60_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error('Handler timed out')),
            ms,
        );
        p.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            },
        );
    });
}

export const GenerateButton = ({
    text = 'generate',
    hideErrors,
    noexec,
    noreset,
    disabled,
    requiredControls,
}: GenerateButtonProps) => {
    // https://github.com/microsoft/TypeScript/issues/14107
    const { getValues, control } = useFormContext();
    const requiredNames = useMemo(() => {
        if (!requiredControls) {
            return [] as string[];
        }
        return Array.isArray(requiredControls)
            ? [...requiredControls]
            : [requiredControls];
    }, [requiredControls]);
    const watchedControls: any = useWatch({
        name: requiredNames,
        disabled: !requiredNames.length,
    });
    const missingValues = useMemo(() => {
        if (!requiredNames.length) {
            return false;
        }
        return requiredNames.some((name) => {
            const watched = watchedControls?.[name];
            // useWatch can report undefined for a control whose value only
            // exists as a defaultValue registered via useController; read
            // the live form state directly in that case.
            const value = watched !== undefined ? watched : getValues(name);
            return !value;
        });
    }, [requiredNames, watchedControls, getValues]);
    const dispatch = useAppDispatch();
    const tr = useTranslate();
    const client_id = useAppSelector((s) => s.config.client_id);
    const status = useAppSelector((s) => s.progress.status);
    const tabs = useAppSelector((s) => s.config.tabs);
    const connected = useAppSelector((s) => s.progress.connected);
    const { visible, ref } = useElementVisibility();
    const isPhone = useIsPhone();
    const finalVisible = visible || !isPhone;
    const generation_disabled =
        (status &&
            (status === statusEnum.WAITING || status === statusEnum.RUNNING)) ||
        tabs === undefined ||
        !connected ||
        disabled ||
        missingValues;
    const [errors, setErrors] = useState<error>(noErrors);
    const tab_name = useTabName();
    const { setValue } = useContext(TabContext);
    const { api, controls } = useAPI();

    const apiUrl = useApiURL();
    const { data: apiData, isSuccess: apiSuccess } = useGet<Workflow>({
        url: api,
        enabled: !!api,
    });
    const handlers = useHandlers();
    const enable_previews = useBooleanSetting(settings.enable_previews);
    const sendPrompt = useEventCallback(async () => {
        dispatch(setStatus(statusEnum.WAITING));
        setErrors(noErrors);
        // Reset the timer first so a stall before the request is sent doesn't
        // leave the previous generation's duration frozen on screen.
        dispatch(clearGenerationTS());
        // Warm up a cold container before any handler does network I/O (the
        // refmod HEAD check would otherwise wait for the start-up itself).
        // Bounded so a dead container can't freeze the generation in WAITING.
        try {
            await fetch(apiUrl + '/api/queue', { signal: timedSignal() });
        } catch {
            // ignore — browsers drop the connection on container start-up
        }

        const params = {
            client_id,
            prompt: cloneDeep(apiData) as Workflow,
        };
        if (enable_previews) {
            (params as any).extra_data = {
                extra_pnginfo: {
                    workflow: {
                        extra: {
                            VHS_latentpreview: true,
                        },
                    },
                },
            };
        }

        const sortedNames = Object.keys(controls).sort(
            (a, b) => order(controls[a]) - order(controls[b]),
        );
        for (const name of sortedNames) {
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
                    const handlerResult = handlers[name](
                        params.prompt,
                        val,
                        controls[name],
                    ); // modify api request
                    if (handlerResult instanceof Promise) {
                        // Coarse safety net: a handler that never settles (a
                        // wedged network call) can't leave WAITING stuck.
                        await withTimeout(handlerResult, HANDLER_TIMEOUT_MS);
                    }
                } catch (e) {
                    console.log(e);
                    toast.error(
                        tr('toasts.error_processing_handler', { name, err: e }),
                    );
                    dispatch(setStatus(statusEnum.ERROR));
                    return;
                }
                continue;
            }
            const ids = Array.isArray(controls[name].id)
                ? controls[name].id
                : [controls[name].id];
            ids.forEach((id) => {
                if (params.prompt[id] === undefined) {
                    setErrors((e) => ({
                        ...e,
                        ids: [...e.ids, id + ` [${name}]`],
                    }));
                    return;
                }
                if (
                    params.prompt[id].inputs[controls[name].field] === undefined
                ) {
                    setErrors((e) => ({
                        ...e,
                        fields: [...e.fields, name + ' / ' + id],
                    }));
                    return;
                }
                params.prompt[id].inputs[controls[name].field] = val;
            });
        }

        const vals = getValues();
        for (const k in vals) {
            if (!(k in controls)) {
                if (hasRegisteredField(control, k)) {
                    // A control is mounted for this field but it has no
                    // config entry — a developer error, surface it as before.
                    setErrors((e) => ({ ...e, api: [...e.api, k] }));
                }
                // Otherwise it's a leftover value with no control bound to it:
                // drop it silently so it stops triggering the error.
                delete vals[k];
            }
        }
        console.log(
            '%cGeneration params: %O',
            'color: green; font-weight: bold; font-size: 1.5em',
            params,
        );
        dispatch(setApi(params.prompt));
        if (noexec) {
            toast.success(tr('toasts.execution_skipped'));
            dispatch(setStatus(statusEnum.FINISHED));
            return Promise.resolve();
        }
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
                        values: cloneDeep(vals),
                    }),
                );
                const previewElement = document.querySelector(
                    `[data-tab="${tab_name}"][data-preview="true"]`,
                );
                if (previewElement) {
                    setTimeout(
                        () =>
                            previewElement.scrollIntoView({
                                behavior: 'smooth',
                            }),
                        100,
                    );
                }
                return;
            }
            const j = await r.json();
            const message = j?.error?.message;
            if (message) {
                toast.error(message);
                dispatch(clearPrompt());
                dispatch(
                    setStatusMessage({
                        status: statusEnum.ERROR,
                        message,
                    }),
                );
            } else {
                // No error detail in the response — still fail out so the
                // button can be retried instead of sticking on WAITING.
                dispatch(setStatus(statusEnum.ERROR));
            }
        }).catch((e) => {
            console.log(e);
            toast.error(tr('toasts.error_sending_generation', { err: e }));
            dispatch(setStatus(statusEnum.ERROR));
        });
    });
    const handleCtrlEnter = useEventCallback((e: KeyboardEvent) => {
        if (
            !generation_disabled &&
            apiSuccess &&
            e.ctrlKey &&
            e.key === 'Enter'
        ) {
            sendPrompt();
        }
    });
    useEffect(() => {
        setValue((s) => ({
            ...s,
            handleCtrlEnter,
        }));
    }, [handleCtrlEnter, setValue]);
    return (
        <FormControl>
            <Box
                ref={ref}
                display='flex'
                alignItems='center'
                justifyContent='center'
                gap={1}
            >
                <Button
                    variant='contained'
                    color='warning'
                    onClick={() => sendPrompt()}
                    disabled={generation_disabled || !apiSuccess}
                    aria-label={tr(`controls.${text}`)}
                    aria-disabled={generation_disabled || !apiSuccess}
                    sx={{
                        mt: 1,
                        mb: 1,
                        visibility: finalVisible ? 'visible' : 'hidden',
                    }}
                >
                    {tr(`controls.${text}`)}
                </Button>
                <ConnectionIndicator
                    sx={{
                        position: 'absolute',
                        right: -30,
                        visibility: finalVisible ? 'visible' : 'hidden',
                    }}
                />
                <Fab
                    variant='circular'
                    color='warning'
                    onClick={() => sendPrompt()}
                    disabled={generation_disabled || !apiSuccess}
                    aria-label={tr(`controls.${text}`)}
                    aria-disabled={generation_disabled || !apiSuccess}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        visibility: finalVisible ? 'hidden' : 'visible',
                    }}
                >
                    <AutoFixHigh />
                </Fab>
                <ConnectionIndicator
                    sx={{
                        position: 'fixed',
                        bottom: 85,
                        right: 38,
                        visibility: finalVisible ? 'hidden' : 'visible',
                    }}
                />
            </Box>
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
            {!noreset && (
                <>
                    <SaveSessionButton sx={{ mt: 2 }} />
                    <ResetButton sx={{ mt: 2 }} />
                </>
            )}
        </FormControl>
    );
};
