import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

export const useActiveTab = () => {
    const prompt = useAppSelector((s) => s.tab.prompt);
    const active_tabs = Object.entries(prompt).map(
        ([, { tab_name }]) => tab_name
    );
    const tab_name = useTabName();
    return active_tabs.includes(tab_name);
};
