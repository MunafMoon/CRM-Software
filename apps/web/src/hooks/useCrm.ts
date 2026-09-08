import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, send } from '../api/client';
export const useData = <T = any>(path: string) =>
  useQuery<T, Error>({ queryKey: [path], queryFn: () => api<T>(path) });
export function useSave() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      method,
    }: {
      path: string;
      body: unknown;
      method?: string;
    }) => send(path, body, method),
    onSuccess: () => cache.invalidateQueries(),
  });
}
