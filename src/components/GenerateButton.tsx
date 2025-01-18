import { Button, FormControl, FormHelperText } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { cloneDeep, get } from 'lodash';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setGenerationDisabled, setStatus } from '../redux/progress';
import { setApi, setWorkflow } from '../redux/tab';

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

export const GenerateButton = () => {
    const dispatch = useAppDispatch();
    const client_id = useAppSelector((s) => s.config.client_id);
    const generation_disabled = useAppSelector(
        (s) => s.progress.generation_disabled
    );
    const [errors, setErrors] = useState<error>(noErrors);
    const { getValues } = useFormContext();
    const current_tab = useAppSelector((s) => get(s, 'tab.current_tab', ''));
    const { api, controls, workflow } = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"]`, {
            api: '',
            controls: {} as any,
            workflow: '',
        })
    );
    const apiUrl = useAppSelector((s) => s.config.api);
    const { data: apiData, isSuccess: apiSuccess } = useGet(api, !!api);
    const { data: wfData, isSuccess: wfSuccess } = useGet(workflow, !!workflow);
    useEffect(() => {
        apiSuccess && dispatch(setApi(apiData));
        wfSuccess && dispatch(setWorkflow(wfData));
    }, [apiData, wfData, apiSuccess, wfSuccess]);
    const { mutate } = useMutation({
        mutationKey: ['prompt'],
        mutationFn: () => {
            const params = {
                client_id,
                prompt: cloneDeep(apiData),
                extra_data: {
                    extra_pnginfo: {
                        workflow: cloneDeep(wfData),
                    },
                },
            };
            setErrors(noErrors);
            for (const name in controls) {
                const val = getValues(name);
                if (val === undefined) {
                    setErrors((e) => ({
                        ...e,
                        controls: [...e.controls, name],
                    }));
                    continue;
                }
                if (!params.prompt[controls[name].id]) {
                    setErrors((e) => ({
                        ...e,
                        ids: [...e.ids, controls[name].id],
                    }));
                    continue;
                }
                if (
                    !params.prompt[controls[name].id].inputs[
                        controls[name].field
                    ]
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
                params.prompt[controls[name].id].inputs[controls[name].field] =
                    val;
            }
            const vals = getValues();
            for (const k in vals) {
                if (!(k in controls)) {
                    setErrors((e) => ({ ...e, api: [...e.api, k] }));
                }
            }
            dispatch(setStatus('Waiting...'));
            return fetch(apiUrl + '/api/prompt', {
                method: 'POST',
                body: JSON.stringify(params),
            })
                .then((r) => {
                    if (r.status === 200) {
                        return;
                    }
                    dispatch(setGenerationDisabled(false));
                    return r.json();
                })
                .then((j) => {
                    if (j?.error?.message) {
                        toast.error(j.error.message);
                    }
                });
        },
    });
    const handleGenerate = () => {
        dispatch(setGenerationDisabled(true));
        mutate();
    };
    return (
        <>
            <FormControl>
                <Button
                    variant='contained'
                    color='warning'
                    onClick={handleGenerate}
                    disabled={generation_disabled || !apiSuccess || !wfSuccess}
                >
                    GENERATE
                </Button>
                {errors.controls.length ? (
                    <FormHelperText error>
                        Missing controls (present in API):{' '}
                        {errors.controls.join(', ')}
                    </FormHelperText>
                ) : null}
                {errors.api.length ? (
                    <FormHelperText error>
                        Missing API bindings (present controls):{' '}
                        {errors.api.join(', ')}
                    </FormHelperText>
                ) : null}
                {errors.ids.length ? (
                    <FormHelperText error>
                        Missing API ids: {errors.ids.join(', ')}
                    </FormHelperText>
                ) : null}
                {errors.fields.length ? (
                    <FormHelperText error>
                        Missing API fields: {errors.fields.join(', ')}
                    </FormHelperText>
                ) : null}
            </FormControl>
        </>
    );
};
