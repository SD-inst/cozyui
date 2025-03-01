import { modelType } from '../../redux/config';
import { useAppSelector } from '../../redux/hooks';

export const useHyvModelChoices = (filter?: (m: modelType) => boolean) => {
    const models = useAppSelector((s) => s.config.models['hunyuan']);
    if (!models) {
        return [];
    }
    return models.filter(filter ?? (() => true)).map((m) => ({
        text: m.name,
        value: m.path,
    }));
};
