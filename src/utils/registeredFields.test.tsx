import { useEffect } from 'react';
import { render } from '@testing-library/react';
import {
    Controller,
    FormProvider,
    useFieldArray,
    useForm,
} from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { beforeEach, describe, expect, it } from 'vitest';
import { hasRegisteredField } from './registeredFields';

let control: Control | undefined;

// Registers real fields in a real react-hook-form instance and exposes its
// `control` object. hasRegisteredField is then exercised against the library's
// actual internals — if react-hook-form changes how it tracks registered
// fields, these assertions fail instead of silently passing on a hand-built
// mock.
const Harness = () => {
    const form = useForm();
    useEffect(() => {
        control = form.control;
    }, [form.control]);
    return (
        <FormProvider {...form}>
            {/* Array field: useFieldArray registers the top-level name */}
            <ArrayField name="ref_images" />
            {/* Simple field: Controller registers 'steps' */}
            <Controller
                name="steps"
                render={({ field }) => <input {...field} />}
            />
            {/* Nested fields: Controller registers 'reference_images.*' */}
            <Controller
                name="reference_images.0.image"
                render={({ field }) => <input {...field} />}
            />
            <Controller
                name="reference_images.1.image"
                render={({ field }) => <input {...field} />}
            />
        </FormProvider>
    );
};

const ArrayField = ({ name }: { name: string }) => {
    // useFieldArray registers the top-level field name in the form's array
    // set; hasRegisteredField checks this for array fields.
    useFieldArray({ name });
    return null;
};

describe('hasRegisteredField', () => {
    it('returns false when there is no control at all', () => {
        expect(hasRegisteredField(undefined, 'steps')).toBe(false);
        expect(hasRegisteredField(null, 'steps')).toBe(false);
    });

    describe('against a real react-hook-form form', () => {
        beforeEach(() => {
            control = undefined;
            render(<Harness />);
        });

        it('returns true for a registered simple field', () => {
            expect(hasRegisteredField(control, 'steps')).toBe(true);
        });

        it('returns true for a registered array field', () => {
            expect(hasRegisteredField(control, 'ref_images')).toBe(true);
        });

        it('returns true for a parent of registered nested fields', () => {
            expect(hasRegisteredField(control, 'reference_images')).toBe(true);
        });

        it('returns false for an unregistered field', () => {
            expect(hasRegisteredField(control, 'removed_control')).toBe(false);
        });

        it('does not treat a sibling name as a parent', () => {
            expect(
                hasRegisteredField(control, 'reference_images_extra'),
            ).toBe(false);
        });
    });
});
