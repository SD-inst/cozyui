import { useAppSelector } from '../redux/hooks';

export const useApiURL = () => useAppSelector((s) => s.config.api);
