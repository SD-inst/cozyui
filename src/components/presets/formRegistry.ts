// The presets panel is a global accordion rendered outside the per-tab
// FormProvider, but "save current tab as preset" needs the active tab's form
// values. Each tab's TabContent (inside its FormProvider) registers its
// getValues here, keyed by tab name.
type FormGetter = () => any;

const forms = new Map<string, FormGetter>();

export const registerForm = (tab: string, getValues: FormGetter) => {
    forms.set(tab, getValues);
};

export const unregisterForm = (tab: string) => {
    forms.delete(tab);
};

export const getCurrentFormValues = (tab: string): any | undefined => {
    return forms.get(tab)?.();
};
