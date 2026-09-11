import { SelectInput } from './SelectInput';
import { ASPECT_LABELS } from '../../utils/aspect';

export const MiniMaxH3ResolutionSelector = ({
    name,
    defaultValue,
}: {
    name: string;
    defaultValue: string;
}) => {
    return (
        <SelectInput
            name={name}
            defaultValue={defaultValue}
            choices={ASPECT_LABELS}
        />
    );
};
