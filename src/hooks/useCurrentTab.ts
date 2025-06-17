import { useAppSelector } from '../redux/hooks';

export const useCurrentTab = () => {
    const { current_tab } = useAppSelector((s) => s.tab);
    return current_tab;
};
