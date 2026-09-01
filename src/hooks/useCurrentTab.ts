import { useAppSelector } from '../redux/hooks';

export const useCurrentTab = () => {
    // Select only the tab id, not the whole s.tab slice — otherwise every
    // unrelated tab action (e.g. addResult per executed node) re-renders consumers.
    return useAppSelector((s) => s.tab.current_tab);
};
