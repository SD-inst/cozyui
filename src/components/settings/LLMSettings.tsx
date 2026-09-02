import { Autocomplete, Box, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { settings } from '../../hooks/settings';
import { useLLMConfig } from '../../hooks/useLLMConfig';
import { useStringSetting } from '../../hooks/useSetting';
import { useTranslate } from '../../i18n/I18nContext';
import { db } from '../history/db';
import { SettingTriState } from './SettingTriState';

export const LLMSettings = () => {
    const tr = useTranslate();
    const { baseURL, apiKey: effectiveApiKey } = useLLMConfig();
    const url = useStringSetting(settings.llm_url);
    const apiKey = useStringSetting(settings.llm_api_key);
    const model = useStringSetting(settings.llm_model);
    const [models, setModels] = useState<string[]>([]);

    useEffect(() => {
        if (!baseURL) {
            setModels([]);
            return;
        }
        let cancelled = false;
        fetch(`${baseURL}/models`, {
            headers: effectiveApiKey
                ? { Authorization: `Bearer ${effectiveApiKey}` }
                : undefined,
        })
            .then((r) => r.json())
            .then((json) => {
                if (cancelled) return;
                const items = Array.isArray(json) ? json : json?.data;
                const ids = (Array.isArray(items) ? items : [])
                    .map((m: any) => m?.id)
                    .filter((id: any): id is string => typeof id === 'string');
                setModels([...new Set(ids)].sort());
            })
            .catch(() => {
                if (!cancelled) {
                    setModels([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [baseURL, effectiveApiKey]);

    return (
        <Box display='flex' flexDirection='column' gap={1} mb={1}>
            <Box display='flex' gap={2} alignItems='center' flexWrap='wrap'>
                <Box flex={1} minWidth={220}>
                    <TextField
                        fullWidth
                        value={url}
                        onChange={(e) =>
                            db.settings.put({
                                name: settings.llm_url,
                                value: e.target.value,
                            })
                        }
                        placeholder='https://host/v1'
                        label={tr('settings.llm_url')}
                        aria-label={tr('settings.llm_url')}
                        size='small'
                    />
                </Box>
                <Box flex={1} minWidth={220}>
                    <TextField
                        fullWidth
                        value={apiKey}
                        onChange={(e) =>
                            db.settings.put({
                                name: settings.llm_api_key,
                                value: e.target.value,
                            })
                        }
                        label={tr('settings.llm_api_key')}
                        aria-label={tr('settings.llm_api_key')}
                        size='small'
                    />
                </Box>
                <Box flex={1} minWidth={220}>
                    <Autocomplete
                        freeSolo
                        value={model}
                        options={models}
                        onChange={(_, v) =>
                            db.settings.put({
                                name: settings.llm_model,
                                value: typeof v === 'string' ? v : '',
                            })
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                label={tr('settings.llm_model')}
                                size='small'
                            />
                        )}
                    />
                </Box>
            </Box>
            <Box display='flex' gap={2} alignItems='center' flexWrap='wrap'>
                <SettingTriState name={settings.llm_supports_video} />
                <SettingTriState name={settings.llm_supports_audio} />
            </Box>
        </Box>
    );
};
