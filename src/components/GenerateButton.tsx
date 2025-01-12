import { Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { cloneDeep } from 'lodash';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useGet } from '../hooks/useGet';
import { useTabContext } from './TabContext';
import toast from 'react-hot-toast';

export const GenerateButton = ({
    id,
    disabled,
    setDisabled,
    tab,
    ...props
}: {
    id: string;
    disabled: boolean;
    setDisabled: (disabled: boolean) => void;
    tab: string;
}) => {
    const [params, setParams] = useState({
        client_id: id,
        prompt: {} as any,
        extra_data: {},
    });
    const { getValues } = useFormContext();
    const tabs = useTabContext();
    const currentTab = tabs[tab] || {};
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
                    setDisabled(false);
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
        setDisabled(false);
    }, [apiSuccess, wfSuccess, apiData, wfData]);
    const handleGenerate = () => {
        setDisabled(true);
        mutate();
    };
    return (
        <Button
            variant='contained'
            color='warning'
            onClick={handleGenerate}
            disabled={disabled}
        >
            GENERATE
        </Button>
    );
};
