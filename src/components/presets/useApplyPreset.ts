import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams, setTab } from '../../redux/tab';

// Dispatches the preset application: switches to the preset's tab and
// hands the preset id to the PresetApplier mounted inside that tab.
export const useApplyPreset = () => {
    const dispatch = useAppDispatch();
    return (preset: { id: string; tab: string }) => {
        dispatch(setTab(preset.tab));
        dispatch(
            setParams({
                action: actionEnum.APPLY_PRESET,
                tab: preset.tab,
                presetId: preset.id,
            }),
        );
    };
};
