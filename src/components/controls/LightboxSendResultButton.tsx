import { useController, useLightboxState } from 'yet-another-react-lightbox';
import {
    SendResultButton,
    SendResultButtonProps,
} from './SendResultButton';

export const LightboxSendResultButton = ({
    ...props
}: SendResultButtonProps) => {
    const { currentIndex } = useLightboxState();
    const { close } = useController();
    return (
        <SendResultButton
            index={currentIndex}
            sx={{ mt: 1, mr: 3, ...props.sx }}
            onClick={close}
            {...props}
        />
    );
};
