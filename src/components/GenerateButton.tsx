import { Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { cloneDeep } from 'lodash';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { useStatus } from './StatusContext';
import { useTabContext } from './TabContext';

export const GenerateButton = () => {
    const { generationDisabled, setStatus, client_id } = useStatus();
    const [params, setParams] = useState({
        client_id,
        prompt: {} as any,
        extra_data: {},
    });
    const { getValues } = useFormContext();
    const currentTab = useTabContext();
    const { data: apiData, isSuccess: apiSuccess } = useGet(
        currentTab.api,
        !!currentTab.api
    );
    const { data: wfData, isSuccess: wfSuccess } = useGet(
        currentTab.workflow,
        !!currentTab.workflow
    );
    const { mutate } = useMutation({
        mutationKey: ['prompt'],
        mutationFn: () => {
            const paramsCopy = cloneDeep(params);
            for (const name in currentTab.controls) {
                const val = getValues(name);
                if (val === undefined) {
                    continue;
                }
                paramsCopy.prompt[currentTab.controls[name].id].inputs[
                    currentTab.controls[name].field
                ] = val;
            }
            return fetch('/cui/api/prompt', {
                method: 'POST',
                body: JSON.stringify(paramsCopy),
            })
                .then((r) => {
                    if (r.status === 200) {
                        return;
                    }
                    setStatus((s) => ({
                        ...s,
                        generationDisabled: false,
                    }));
                    return r.json();
                })
                .then((j) => {
                    if (j?.error?.message) {
                        toast.error(j.error.message);
                    }
                });
        },
    });
    useEffect(() => {
        if (!apiSuccess || !wfSuccess) {
            return;
        }
        setParams((p) => ({
            ...p,
            prompt: apiData,
            extra_data: {
                extra_pnginfo: {
                    workflow: wfData,
                },
            },
        }));
    }, [apiSuccess, wfSuccess, apiData, wfData]);
    const handleGenerate = () => {
        setStatus((s) => ({
            ...s,
            generationDisabled: true,
            status: 'Waiting...',
            api: apiData,
        }));
        mutate();
    };
    return (
        <Button
            variant='contained'
            color='warning'
            onClick={handleGenerate}
            disabled={generationDisabled || !apiSuccess || !wfSuccess}
        >
            GENERATE
        </Button>
    );
};
