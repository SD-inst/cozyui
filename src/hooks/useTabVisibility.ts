import { useContext, useMemo } from 'react';
import { WorkflowTabsContext } from '../components/contexts/WorkflowTabsContext';
import { useAppSelector } from '../redux/hooks';
import { useHiddenTabs } from './useHiddenTabs';

export const useTabVisibility = () => {
    const { workflowTabs } = useContext(WorkflowTabsContext);
    const { show_only, hide_only } = useAppSelector(
        (s) => s.config.tab_visibility,
    );
    const hiddenTabs = useHiddenTabs();
    const allVisibleTabs = useMemo(
        () =>
            workflowTabs.filter(
                (w) =>
                    (show_only.includes(w) || !show_only.length) &&
                    (!hide_only.includes(w) || !hide_only.length),
            ),
        [hide_only, show_only, workflowTabs],
    );
    const userFilteredTabs = useMemo(
        () => allVisibleTabs.filter((t) => !hiddenTabs?.includes(t)),
        [allVisibleTabs, hiddenTabs],
    );
    return { allVisibleTabs, userFilteredTabs };
};
