import { Control } from 'react-hook-form';

/**
 * Returns true when a control is currently mounted for the given top-level
 * form field: the field itself (or an array field with the same name) is
 * registered, or it is a parent of one or more registered sub-fields.
 *
 * react-hook-form has no public "list registered fields" API; the internal
 * `control._names` set (populated by register/Controller/useFieldArray) is the
 * reliable signal. It lets us tell a field that still has a live control bound
 * to it apart from a leftover value that only survives in the persisted form
 * state (e.g. from a control that was removed from the workflow).
 */
export const hasRegisteredField = (
    control: Control | null | undefined,
    name: string,
): boolean => {
    if (!control) {
        return false;
    }
    const { mount, array } = control._names;
    if (array.has(name)) {
        return true;
    }
    if (mount.has(name)) {
        return true;
    }
    const prefix = name + '.';
    for (const n of mount) {
        if (n.startsWith(prefix)) {
            return true;
        }
    }
    return false;
};
