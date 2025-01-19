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
}) => {
    const obj = useAppSelector((s) => s.config.object_info);
    return get(
        obj,
        `["${component}"].input[${
            optional ? 'optional' : 'required'
        }]["${field}"][${index}]`,
        []
    ) as string[];
};
