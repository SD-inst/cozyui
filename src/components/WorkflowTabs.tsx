import { useTabOrder } from '../hooks/useTabOrder';
import { SortableTabs } from './SortableTabs';
import { useLiveQuery } from 'dexie-react-hooks';
import { TabsProps } from '@mui/material';
import React, {
    Children,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { reorderItems } from '../utils/orderTabs';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useCurrentTab } from '../hooks/useCurrentTab';
import { useRestoreValues } from '../hooks/useRestoreValues';
import { useSetDefaults } from '../hooks/useSetDefaults';
import { useStringSetting } from '../hooks/useSetting';
import { useTabVisibility } from '../hooks/useTabVisibility';
import { settings } from '../hooks/settings';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { filterFormValues } from '../utils/filterFormValues';
import { useTabName } from './contexts/TabContext';
import { TabContextProvider } from './contexts/TabContextProvider';
import { WorkflowTabsContext } from './contexts/WorkflowTabsContext';
import { db } from './history/db';
import { VerticalBox } from './VerticalBox';
import { PresetApplier } from './presets/PresetApplier';
import { registerForm, unregisterForm } from './presets/formRegistry';

const ValuesRestore = ({
    onInitialized,
}: {
    onInitialized?: () => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const dispatch = useAppDispatch();
    const tab_name = useTabName();
    const { isLoaded, setDefaults } = useSetDefaults();
    const [initialized, setInitialized] = useState(false);
    const idb = useLiveQuery(
        async () => (await db.formState.get(tab_name)) ?? null,
        [tab_name],
    );
    const setValue = useRestoreValues();
    useEffect(() => {
        if (!initialized || tab !== tab_name || action !== actionEnum.RESTORE) {
            return;
        }
        dispatch(setParams({}));
        setTimeout(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth' });
            setValue('', values);
        }, 0);
    }, [action, dispatch, initialized, setValue, tab, tab_name, values]);
    useEffect(() => {
        if (initialized || idb === undefined || !isLoaded) {
            // not loaded yet or already applied
            return;
        }
        setDefaults();
        if (idb === null) {
            // no state in database
            setInitialized(true);
            onInitialized?.();
            return;
        }
        const vals = JSON.parse(idb.state);
        if (vals) {
            setValue('', vals);
        }
        setInitialized(true);
        onInitialized?.();
    }, [setValue, idb, isLoaded, setDefaults, tab_name, initialized, onInitialized]);
    const vals = useWatch();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!initialized) {
            return;
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            const filtered = filterFormValues(vals);
            db.formState.put({ tab: tab_name, state: JSON.stringify(filtered) });
            saveTimeoutRef.current = null;
        }, 1000);
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [vals, tab_name, initialized]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveTimeoutRef.current) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
    return <div ref={ref} style={{ height: 0 }} />;
};

const TabContent = ({ ...props }) => {
    const current_tab = useCurrentTab();
    const form = useForm();
    const { value, content } = (props.children.props as any) ?? {};
    // true once ValuesRestore has finished initializing this tab's form;
    // PresetApplier must only run after that
    const [formInitialized, setFormInitialized] = useState(false);
    // Expose this tab's form values to the global presets panel
    useEffect(() => {
        registerForm(value, form.getValues);
        return () => {
            unregisterForm(value);
        };
    }, [value, form.getValues]);
    // workaround to fix form reset after switching to another tab and back
    // we use IDB for form persistence and controls are removed from DOM
    // on tab switch. Need to reset the form as well or else default values
    // get lost
    useEffect(() => {
        if (current_tab !== value) {
            form.reset();
            setFormInitialized(false);
        }
    }, [current_tab, form, value]);
    if (!React.isValidElement(props.children)) {
        return;
    }
    return (
        <TabContextProvider value={{ tab_name: value }}>
            <VerticalBox
                mt={3}
                width='100%'
                display={current_tab === value ? 'flex' : 'none'}
            >
                <FormProvider {...form}>
                    {current_tab === value && (
                        <ValuesRestore
                            onInitialized={() => setFormInitialized(true)}
                        />
                    )}
                    {current_tab === value && (
                        <PresetApplier formInitialized={formInitialized} />
                    )}
                    {content}
                </FormProvider>
            </VerticalBox>
        </TabContextProvider>
    );
};

const SUBTAB_TABS_SX: TabsProps['sx'] = { mt: -2 };

const SubTabContent = ({
    group,
    active,
    onTabDragEnd,
    ...props
}: React.PropsWithChildren & {
    group: string;
    active: boolean;
    onTabDragEnd: (group: string, activeId: string, overId: string) => void;
}) => {
    const current_tab = useCurrentTab();
    const dispatch = useAppDispatch();
    const items = useMemo(
        () =>
            Children.toArray(props.children)
                .filter((c) => React.isValidElement(c))
                .map((c) => (c.props as any).value),
        [props.children],
    );
    const labels = useMemo(() => {
        const result: { [id: string]: React.ReactNode } = {};
        Children.toArray(props.children).forEach((c) => {
            if (React.isValidElement(c)) {
                result[(c.props as any).value] = (c.props as any).label;
            }
        });
        return result;
    }, [props.children]);
    const handleTabDragEnd = useCallback(
        (activeId: string, overId: string) =>
            onTabDragEnd(group, activeId, overId),
        [group, onTabDragEnd],
    );
    const handleTabClick = useCallback(
        (id: string) => dispatch(setTab(id)),
        [dispatch],
    );
    return (
        <VerticalBox mt={3} width='100%' display={active ? 'flex' : 'none'}>
            <SortableTabs
                items={items}
                activeId={active ? current_tab : ''}
                labels={labels}
                onDragEnd={handleTabDragEnd}
                onItemClick={handleTabClick}
                sx={SUBTAB_TABS_SX}
            />
            {Children.toArray(props.children).map((c) => {
                if (!React.isValidElement(c)) {
                    return null;
                }
                return (
                    <TabContent key={(c.props as any).value}>{c}</TabContent>
                );
            })}
        </VerticalBox>
    );
};

type activeType = { [group: string]: string };

const GroupTabContents = ({
    groups,
    onTabDragEnd,
}: {
    groups: groupType;
    onTabDragEnd: (group: string, activeId: string, overId: string) => void;
}) => {
    const current_tab = useCurrentTab();
    return Object.entries(groups).map((e) => {
        const tabValues = e[1].map((c) => c.props.value);
        const selected = tabValues.includes(current_tab);
        return (
            <SubTabContent
                key={e[0]}
                group={e[0]}
                active={selected}
                onTabDragEnd={onTabDragEnd}
            >
                {e[1]}
            </SubTabContent>
        );
    });
};

type groupType = {
    [group: string]: React.ReactElement[];
};

export const WorkflowTabs = ({ ...props }: React.PropsWithChildren) => {
    const current_tab = useCurrentTab();
    const dispatch = useAppDispatch();
    const {
        setWorkflowTabs,
        setWorkflowTabGroups,
        setReceivers,
        setResetTabOrder,
        workflowTabGroups,
    } = useContext(WorkflowTabsContext);
    const { userFilteredTabs } = useTabVisibility();
    const visibleTabs = useMemo(
        () =>
            (props.children as any[]).filter((t) =>
                userFilteredTabs.includes(t.props.value),
            ),
        [props.children, userFilteredTabs],
    );
    // Restore last active tab from IndexedDB
    // undefinedAwait: true — returns undefined until DB resolves
    const savedTab = useStringSetting(settings.last_active_tab, '', true);

    // Full (unfiltered) list of groups and tabs in their default (code) order,
    // so that hidden and newly-added tabs keep a stable position in the saved order
    const allGroups = useMemo(() => {
        const g: string[] = [];
        React.Children.forEach(props.children, (c) => {
            if (
                React.isValidElement(c) &&
                c.props.group &&
                !g.includes(c.props.group)
            ) {
                g.push(c.props.group);
            }
        });
        return g;
    }, [props.children]);
    const allTabsByGroup = useMemo(() => {
        const result: { [group: string]: string[] } = {};
        React.Children.forEach(props.children, (c) => {
            if (React.isValidElement(c) && c.props.group) {
                if (!result[c.props.group]) {
                    result[c.props.group] = [];
                }
                result[c.props.group].push(c.props.value);
            }
        });
        return result;
    }, [props.children]);

    const { order, saveOrder, resetOrder } = useTabOrder(
        allGroups,
        allTabsByGroup,
    );

    // Expose the reset callback to the settings panel (different subtree)
    useEffect(() => {
        setResetTabOrder(resetOrder);
    }, [resetOrder, setResetTabOrder]);

    // Save active tab to IndexedDB when it changes
    useEffect(() => {
        if (current_tab) {
            db.settings.put({
                name: settings.last_active_tab,
                value: current_tab,
            });
        }
    }, [current_tab]);

    // fill all available tabs
    useEffect(() => {
        const workflowTabs = Children.map(
            props.children as Array<React.Component<any>>,
            (c) => c.props.value,
        );
        const r = Children.map(
            props.children as Array<React.Component<any>>,
            (c) => {
                if (c.props.receivers) {
                    const result = {
                        [c.props.value]: c.props.receivers,
                    };
                    return result;
                }
                return null;
            },
        );
        const receivers = r.reduce((p, v) => Object.assign(p, v), {});
        setWorkflowTabs(workflowTabs);
        setReceivers(receivers);
    }, [props.children, setReceivers, setWorkflowTabs]);
    // switch to saved tab or first visible tab if none are selected
    useEffect(() => {
        // Wait for config and DB to be loaded
        if (!props.children || !(props.children as any).length) {
            return;
        }
        // Don't override if a tab is already selected
        if (current_tab) {
            return;
        }
        // Wait for savedTab to be loaded from DB (undefined = still loading)
        if (savedTab === undefined) {
            return;
        }
        // Try to restore the last active tab if it's visible
        if (savedTab && visibleTabs.some((t) => t.props.value === savedTab)) {
            dispatch(setTab(savedTab));
            return;
        }
        // Fallback to first visible tab (savedTab is '' or tab is hidden)
        if (visibleTabs.length) {
            dispatch(setTab(visibleTabs[0].props.value));
        }
    }, [dispatch, props.children, current_tab, visibleTabs, savedTab]);
    // if a hidden tab is selected, unselect tab
    useEffect(() => {
        if (current_tab && !userFilteredTabs.includes(current_tab)) {
            dispatch(setTab(''));
        }
    }, [current_tab, dispatch, userFilteredTabs]);

    const activeSubtabs = useRef<activeType>({});

    const groups = useMemo(() => {
        const raw: groupType = {};
        React.Children.forEach(props.children, (c) => {
            if (
                !React.isValidElement(c) ||
                !c.props.group ||
                !userFilteredTabs.includes(c.props.value)
            ) {
                return;
            }
            if (!raw[c.props.group]) {
                raw[c.props.group] = [c];
            } else {
                raw[c.props.group].push(c);
            }
        });
        // Sort groups by saved order, and tabs within each group
        const sorted: groupType = {};
        for (const g of order.groups) {
            if (!raw[g]) {
                continue;
            }
            const orderTabs = order.tabs[g] ?? [];
            sorted[g] = [...raw[g]].sort((a, b) => {
                const ia = orderTabs.indexOf((a.props as any).value);
                const ib = orderTabs.indexOf((b.props as any).value);
                return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
            });
        }
        return sorted;
    }, [props.children, userFilteredTabs, order]);

    // remember selected subtabs (for group click navigation)
    useEffect(() => {
        for (const [g, tabs] of Object.entries(groups)) {
            if (tabs.some((t) => (t.props as any).value === current_tab)) {
                activeSubtabs.current[g] = current_tab;
            }
        }
    }, [groups, current_tab]);

    // index tab groups
    useEffect(() => {
        const tabGroups = Object.fromEntries(
            Object.entries(groups).flatMap((e) =>
                e[1].map((t) => [t.props.value, e[0]]),
            ),
        );
        setWorkflowTabGroups(tabGroups);
    }, [groups, setWorkflowTabGroups, userFilteredTabs.length]);

    const selectedGroupTab = workflowTabGroups[current_tab];
    const visibleGroups = useMemo(() => Object.keys(groups), [groups]);
    const groupLabels = useMemo(
        () => Object.fromEntries(visibleGroups.map((g) => [g, g])),
        [visibleGroups],
    );

    const handleGroupClick = useCallback(
        (group: string) => {
            if (!activeSubtabs.current[group]) {
                activeSubtabs.current[group] = groups[group][0].props.value;
            }
            dispatch(setTab(activeSubtabs.current[group]));
        },
        [groups, dispatch],
    );
    // Reorder is applied to the FULL order (order.groups / order.tabs[g]), not
    // the visible-only list, so hidden groups/tabs keep their saved positions
    const handleGroupDragEnd = useCallback(
        (activeId: string, overId: string) => {
            saveOrder(
                reorderItems(order.groups, activeId, overId),
                order.tabs,
            );
        },
        [order, saveOrder],
    );
    const handleTabDragEnd = useCallback(
        (group: string, activeId: string, overId: string) => {
            saveOrder(
                order.groups,
                {
                    ...order.tabs,
                    [group]: reorderItems(
                        order.tabs[group] ?? [],
                        activeId,
                        overId,
                    ),
                },
            );
        },
        [order, saveOrder],
    );

    return (
        <>
            <SortableTabs
                items={visibleGroups}
                activeId={selectedGroupTab || ''}
                labels={groupLabels}
                onDragEnd={handleGroupDragEnd}
                onItemClick={handleGroupClick}
            />
            <GroupTabContents groups={groups} onTabDragEnd={handleTabDragEnd} />
        </>
    );
};
