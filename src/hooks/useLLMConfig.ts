import { llmConfigType } from '../redux/config';
import { useAppSelector } from '../redux/hooks';
import { RootState } from '../redux/store';
import { settings } from './settings';
import { useStringSetting } from './useSetting';

/**
 * Resolve a tri-state support override: an empty value means "not overridden"
 * (fall back to the config flag); 'true'/'false' override it explicitly.
 */
const resolveSupport = (
    override: string | undefined,
    fallback?: boolean,
): boolean => (override === 'true' ? true : override === 'false' ? false : !!fallback);

/**
 * Effective LLM config: the config values with the settings overrides
 * applied (empty values fall back to the config). The model override
 * applies to both the regular and the VLM model. The video/audio support
 * overrides let the user adjust the capabilities when picking a different
 * model, without editing the config.
 */
export const useLLMConfig = (): llmConfigType => {
    const config: llmConfigType = useAppSelector(
        (state: RootState) => state.config.llm || ({} as llmConfigType),
    );
    const url = useStringSetting(settings.llm_url);
    const apiKey = useStringSetting(settings.llm_api_key);
    const model = useStringSetting(settings.llm_model);
    const videoOverride = useStringSetting(settings.llm_supports_video);
    const audioOverride = useStringSetting(settings.llm_supports_audio);
    return {
        ...config,
        baseURL: url || config.baseURL,
        apiKey: apiKey || config.apiKey,
        model: model || config.model,
        modelVision: model || config.modelVision,
        supportsVideo: resolveSupport(videoOverride, config.supportsVideo),
        supportsAudio: resolveSupport(audioOverride, config.supportsAudio),
    };
};
