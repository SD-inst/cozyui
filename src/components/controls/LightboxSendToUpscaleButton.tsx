import { useController, useLightboxState } from 'yet-another-react-lightbox';
import {
    SendToUpscaleButton,
    SendToUpscaleButtonProps,
} from './SendToUpscaleButton';

export const LightboxSendToUpscaleButton = ({
    ...props
}: SendToUpscaleButtonProps) => {
    const { currentIndex } = useLightboxState();
    const { close } = useController();
    return (
        <SendToUpscaleButton
            index={currentIndex}
            sx={{ mt: 1, mr: 3, ...props.sx }}
            onClick={close}
            {...props}
        />
    );
};
