import { SendBackButton } from './SendBackButton';
import { SendResultButtonProps } from './SendResultButton';

export const SendBackToI2IButton = ({ ...props }: SendResultButtonProps) => {
    return <SendBackButton fileField='i2i' label='send_to_i2i' {...props} />;
};
