import { useEffect } from 'react';
import { setHandler } from '../redux/api_handlers';
import { useAppDispatch } from '../redux/hooks';
import { useCurrentTab } from '../components/contexts/TabContext';

export type handlerFuncType = (api: any, values: any) => void;

export const useRegisterHandler = ({
    name,
    handler,
}: {
    name: string;
    handler: handlerFuncType;
}) => {
    const dispatch = useAppDispatch();
    const current_tab = useCurrentTab();
    useEffect(() => {
        if (typeof current_tab !== 'string') {
            return;
        }
        dispatch(
            setHandler({
                tab_name: current_tab,
                control_name: name,
                handler,
            })
        );
    }, [current_tab, handler, name, dispatch]);
};
