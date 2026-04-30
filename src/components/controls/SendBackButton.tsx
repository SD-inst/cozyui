import { useCurrentTab } from '../../hooks/useCurrentTab';
import { SendResultButton, SendResultButtonProps } from './SendResultButton';

export const SendBackButton = ({ ...props }: SendResultButtonProps) => {
    const tab = useCurrentTab();
    return (
        <SendResultButton
            targetTab={tab}
            label='send_back'
            showMenu={false}
            {...props}
        />
    );
};
