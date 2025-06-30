import { HYLengthInput } from './HYLengthInput';

export const WanLengthInput = ({ ...props }) => {
    return (
        <HYLengthInput defaultValue={81} fps={16} max={[97, 257]} {...props} />
    );
};
