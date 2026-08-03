import { SelectInput } from './SelectInput';

const aspectRatioChoices = [
    '1:1 (Square)',
    '2:3 (Portrait Photo)',
    '3:2 (Photo)',
    '3:4 (Portrait Standard)',
    '4:3 (Standard)',
    '9:16 (Portrait Widescreen)',
    '16:9 (Widescreen)',
    '21:9 (Ultrawide)',
];

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
            choices={aspectRatioChoices}
        />
    );
};
