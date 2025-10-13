import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';

export const useListChoices = ({
    component,
    optional,
    field,
    index,
}: {
    component: string;
    optional?: boolean;
    field: string;
    index: number;
}): string[] => {
    const obj = useAppSelector((s) => s.config.object_info);
    const value = get(
        obj,
        [component, 'input', optional ? 'optional' : 'required', field],
        []
    );
    if (
        Array.isArray(value) &&
        value.length === 2 &&
        value[0] === 'COMBO' &&
        Array.isArray(value[1].options)
    ) {
        // Upscale Model
        return value[1].options;
    }
    return value[index] || [];
};
