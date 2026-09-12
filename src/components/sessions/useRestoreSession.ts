import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams, setTab } from '../../redux/tab';

// Dispatches the session restore: switches to the session's tab and hands the
// session id to the SnapshotApplier mounted inside that tab.
export const useRestoreSession = () => {
    const dispatch = useAppDispatch();
    return (
        session: { id: string; tab: string },
        { deleteAfter = false }: { deleteAfter?: boolean } = {},
    ) => {
        dispatch(setTab(session.tab));
        dispatch(
            setParams({
                action: actionEnum.RESTORE_SESSION,
                tab: session.tab,
                sessionId: session.id,
                deleteAfter,
            }),
        );
    };
};
