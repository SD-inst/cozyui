import { HYLengthInput } from './HYLengthInput';

export const WanLengthInput = ({ ...props }) => {
    return (
        <HYLengthInput defaultValue={81} fps={16} max={[129, 257]} {...props} />
    );
};
