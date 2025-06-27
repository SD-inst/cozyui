import { useController, useLightboxState } from 'yet-another-react-lightbox';
import {
    SendResultButton,
    SendToUpscaleButtonProps,
} from './SendResultButton';

export const LightboxSendToUpscaleButton = ({
    ...props
}: SendToUpscaleButtonProps) => {
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
