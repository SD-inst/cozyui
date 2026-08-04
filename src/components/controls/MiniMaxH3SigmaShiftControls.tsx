import { SliderInput } from './SliderInput';

export const MiniMaxH3SigmaShiftControls = () => {
    return (
        <>
            <SliderInput
                name='sigma_shift_video'
                label='sigma_shift_video'
                defaultValue={12}
                min={0}
                max={20}
                step={0.1}
            />
            <SliderInput
                name='sigma_shift_audio'
                label='sigma_shift_audio'
                defaultValue={3}
                min={0}
                max={10}
                step={0.1}
            />
        </>
    );
};
