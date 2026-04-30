import { SendBackButton } from './SendBackButton';
import { SendResultButtonProps } from './SendResultButton';

export const SendBackToI2IxButton = ({ ...props }: SendResultButtonProps) => {
    return <SendBackButton fileField='i2i' {...props} />;
};
