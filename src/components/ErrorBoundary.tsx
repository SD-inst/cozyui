// Without a boundary React unmounts the entire tree on any uncaught render or
// effect error, which on a phone looks like the controls appearing and then
// vanishing for no reason. A boundary keeps the rest of the page alive, and its
// fallback says what broke instead of leaving the user to guess.
import { Component, ErrorInfo, ReactNode } from 'react';
import { describeError } from '../utils/crashReport';
import { reportCrash } from '../utils/crashOverlay';

export type errorBoundaryPropsType = {
    children: ReactNode;
    // Rendered in place of the crashed subtree, with a retry that re-mounts it.
    // With no fallback the crash is fatal and the DOM overlay reports it — that
    // is the surface which still works when React itself is the thing that
    // broke, so the root boundary does not need a fallback of its own.
    fallback?: (error: unknown, retry: () => void) => ReactNode;
};

type errorBoundaryStateType = { failed: boolean; error: unknown };

export class ErrorBoundary extends Component<
    errorBoundaryPropsType,
    errorBoundaryStateType
> {
    state: errorBoundaryStateType = { failed: false, error: null };

    static getDerivedStateFromError(
        error: unknown,
    ): errorBoundaryStateType {
        return { failed: true, error };
    }

    componentDidCatch(error: unknown, info: ErrorInfo): void {
        if (this.props.fallback) {
            return;
        }
        const described = describeError(error);
        reportCrash({
            kind: 'render',
            ...described,
            // The component stack names the path to the broken component, which
            // is what is missing when the error itself carries no stack.
            stack: described.stack ?? info.componentStack ?? undefined,
        });
    }

    render(): ReactNode {
        if (!this.state.failed) {
            return this.props.children;
        }
        if (!this.props.fallback) {
            return null;
        }
        return this.props.fallback(this.state.error, () =>
            this.setState({ failed: false, error: null }),
        );
    }
}
