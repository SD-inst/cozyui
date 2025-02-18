import { useAppSelector } from '../../redux/hooks';

export const useHyvModelChoices = () => {
    const models = useAppSelector((s) => s.config.models['hunyuan']);
    if (!models) {
        return [];
    }
    return models.map((m) => ({
        text: m.name,
        value: m.path,
        alsoSet: [
            {
                name: 'quantization',
                value: m.quantization || 'fp8_e4m3fn',
            },
        ],
    }));
};
