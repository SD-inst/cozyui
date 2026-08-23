import { llmConfigType } from '../redux/config';
import { useAppSelector } from '../redux/hooks';
import { RootState } from '../redux/store';
import { settings } from './settings';
import { useStringSetting } from './useSetting';

/**
 * Effective LLM config: the config values with the settings overrides
 * applied (empty values fall back to the config). The model override
 * applies to both the regular and the VLM model.
 */
export const useLLMConfig = (): llmConfigType => {
    const config: llmConfigType = useAppSelector(
        (state: RootState) => state.config.llm || ({} as llmConfigType),
    );
    const url = useStringSetting(settings.llm_url);
    const model = useStringSetting(settings.llm_model);
    return {
        ...config,
        baseURL: url || config.baseURL,
        model: model || config.model,
        modelVision: model || config.modelVision,
    };
};
