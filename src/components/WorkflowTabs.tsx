import { Tab, Tabs, useEventCallback } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { get } from 'lodash';
import React, {
    Children,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    FormProvider,
    useForm,
    useFormContext,
    useWatch,
} from 'react-hook-form';
import { useCurrentTab } from '../hooks/useCurrentTab';
import { useHiddenTabs } from '../hooks/useHiddenTabs';
import { useSetDefaults } from '../hooks/useSetDefaults';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { useTabName } from './contexts/TabContext';
import { TabContextProvider } from './contexts/TabContextProvider';
import { WorkflowTabsContext } from './contexts/WorkflowTabsContext';
import { db } from './history/db';
import { VerticalBox } from './VerticalBox';

const useRestoreValues = () => {
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null)
    );
    const { setValue } = useFormContext();
    return useEventCallback((key: string, value: any) => {
        if (!api) {
            console.log(
                `Trying to set ${key} to ${value} but tab ${tab_name} isn't loaded yet`
            );
            return;
        }
        if (api.controls[key]) {
            setValue(key, value, { shouldDirty: false });
        }
    });
};

const ValuesRestore = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const dispatch = useAppDispatch();
    const tab_name = useTabName();
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'defaults'], null)
    );
    const { isLoaded, setDefaults } = useSetDefaults();
    const [initialized, setInitialized] = useState(false);
    const idb = useLiveQuery(
        async () => (await db.formState.get(tab_name)) ?? null,
        [tab_name]
    );
    const setValue = useRestoreValues();
    useEffect(() => {
        if (!initialized || tab !== tab_name || action !== actionEnum.RESTORE) {
            return;
        }
        Object.keys(values).forEach((k) => setValue(k, values[k]));
        dispatch(setParams({}));
        setTimeout(
            () => ref.current?.scrollIntoView({ behavior: 'smooth' }),
            0
        );
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
            return;
        }
        const vals = JSON.parse(idb.state);
        if (vals) {
            Object.keys(vals).forEach((c) => {
                setValue(c, vals[c]);
            });
        }
        setInitialized(true);
    }, [defaults, setValue, idb, isLoaded, setDefaults, tab_name, initialized]);
    const vals = useWatch();
    useEffect(() => {
        if (!initialized) {
            return;
        }
        db.formState.put({ tab: tab_name, state: JSON.stringify(vals) });
    }, [vals, tab_name, initialized]);
    return <div ref={ref} style={{ height: 0 }} />;
};

const TabContent = ({ ...props }) => {
    const current_tab = useCurrentTab();
    const form = useForm();
    if (!React.isValidElement(props.children)) {
        return;
    }
    const { value, content } = props.children.props as any;
    return (
        <TabContextProvider value={{ tab_name: value }}>
            <VerticalBox
                mt={3}
                width='100%'
                display={current_tab === value ? 'flex' : 'none'}
            >
                <FormProvider {...form}>
                    {current_tab === value && <ValuesRestore />}
                    {content}
                </FormProvider>
            </VerticalBox>
        </TabContextProvider>
    );
};

const SubTabContent = ({
    active,
    ...props
}: React.PropsWithChildren & { active: boolean }) => {
    const current_tab = useCurrentTab();
    const dispatch = useAppDispatch();
    const ref = useRef<HTMLDivElement>(null);
    useScroller(ref.current);
    return (
        <VerticalBox mt={3} width='100%' display={active ? 'flex' : 'none'}>
            <Tabs
                value={active ? current_tab : false}
                onChange={(_, v) => dispatch(setTab(v))}
                variant='scrollable'
                sx={{ width: '100%', mt: -2 }}
                ref={ref}
            >
                {Children.map(props.children, (c) => {
                    if (!React.isValidElement(c)) {
                        return null;
                    }
                    const { label, value } = c.props;
                    return <Tab label={label} value={value} key={value} />;
                })}
            </Tabs>
            {Children.map(props.children, (c) => {
                if (!React.isValidElement(c)) {
                    return null;
                }
                return <TabContent key={c.props.value}>{c}</TabContent>;
            })}
        </VerticalBox>
    );
};

type activeType = { [group: string]: string };

const GroupTabs = ({ groups }: { groups: groupType }) => {
    const dispatch = useAppDispatch();
    const current_tab = useCurrentTab();
    const activeSubtabs = useRef<activeType>({}); // remember selected subtabs here
    return Object.entries(groups).map((e) => {
        const tabValues = e[1].map((c) => c.props.value);
        const selected = tabValues.includes(current_tab);
        if (selected) {
            activeSubtabs.current[e[0]] = current_tab;
        }
        return (
            <Tab
                label={e[0]}
                value={e[0]}
                key={e[0]}
                onClick={() => {
                    if (!activeSubtabs.current[e[0]]) {
                        activeSubtabs.current[e[0]] = e[1][0].props.value;
                    }
                    dispatch(setTab(activeSubtabs.current[e[0]]));
                }}
            />
        );
    });
};

const GroupTabContents = ({ groups }: { groups: groupType }) => {
    const current_tab = useCurrentTab();
    return Object.entries(groups).map((e) => {
        const tabValues = e[1].map((c) => c.props.value);
        const selected = tabValues.includes(current_tab);
        return (
            <SubTabContent key={e[0]} active={selected}>
                {e[1]}
            </SubTabContent>
        );
    });
};

type groupType = {
    [group: string]: React.ReactElement[];
};

const useScroller = (root: HTMLDivElement | null) => {
    useEffect(() => {
        if (!root) {
            return;
        }
        const c = root.getElementsByClassName('MuiTabs-scroller');
        if (!c?.length) {
            return;
        }
        const scroller = c.item(0) as HTMLDivElement;
        if (!scroller) {
            return;
        }
        scroller.addEventListener('wheel', (e: WheelEvent) => {
            if (!root || !e) {
                return;
            }
            e.preventDefault();
            scroller.scrollLeft += e.deltaY;
        });
    }, [root]);
};

export const WorkflowTabs = ({ ...props }: React.PropsWithChildren) => {
    const current_tab = useCurrentTab();
    const dispatch = useAppDispatch();
    const {
        setWorkflowTabs,
        setWorkflowTabGroups,
        setReceivers,
        workflowTabGroups,
    } = useContext(WorkflowTabsContext);
    const hiddenTabs = useHiddenTabs();
    const visibleTabs = useMemo(() => {
        if (hiddenTabs === undefined) {
            return [];
        }
        return (props.children as any[]).filter(
            (t) => !hiddenTabs.includes(t.props.value)
        );
    }, [hiddenTabs, props.children]);
    // fill all available tabs
    useEffect(() => {
        const workflowTabs = Children.map(
            props.children as Array<React.Component<any>>,
            (c) => c.props.value
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
            }
        );
        const receivers = r.reduce((p, v) => Object.assign(p, v), {});
        setWorkflowTabs(workflowTabs);
        setReceivers(receivers);
    }, [props.children, setReceivers, setWorkflowTabs]);
    // switch to first visible tab if none are selected
    useEffect(() => {
        if (
            !props.children ||
            !(props.children as any).length ||
            current_tab ||
            hiddenTabs === undefined
        ) {
            return;
        }
        if (visibleTabs.length) {
            dispatch(setTab(visibleTabs[0].props.value));
        }
    }, [dispatch, props.children, current_tab, hiddenTabs, visibleTabs]);
    // if a hidden tab is selected, unselect tab
    useEffect(() => {
        if (hiddenTabs === undefined || !hiddenTabs.includes(current_tab)) {
            return;
        }
        if (hiddenTabs.includes(current_tab)) {
            dispatch(setTab(''));
        }
    }, [current_tab, dispatch, hiddenTabs, props.children, setWorkflowTabs]);
    const ref = useRef<HTMLDivElement>(null);
    useScroller(ref.current);
    const groups = useMemo(() => {
        const result: groupType = {};
        React.Children.forEach(props.children, (c) => {
            if (
                !React.isValidElement(c) ||
                !c.props.group ||
                hiddenTabs?.includes(c.props.value)
            ) {
                return;
            }
            if (!result[c.props.group]) {
                result[c.props.group] = [c];
            } else {
                result[c.props.group].push(c);
            }
        });
        return result;
    }, [hiddenTabs, props.children]);
    // index tab groups
    useEffect(() => {
        const tabGroups = Object.fromEntries(
            Object.entries(groups).flatMap((e) =>
                e[1].map((t) => [t.props.value, e[0]])
            )
        );
        setWorkflowTabGroups(tabGroups);
    }, [groups, setWorkflowTabGroups]);
    const selectedGroupTab = workflowTabGroups[current_tab];
    const activeTab =
        Object.keys(workflowTabGroups).length > 0
            ? selectedGroupTab || current_tab || false
            : false;
    return (
        <>
            <Tabs
                ref={ref}
                value={activeTab}
                onChange={(_, v) => dispatch(setTab(v))}
                variant='scrollable'
                sx={{ width: '100%' }}
            >
                {GroupTabs({ groups })}
            </Tabs>
            <GroupTabContents groups={groups} />
        </>
    );
};
