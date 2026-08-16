import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clearNopes, createNope, deleteNope, fetchNopes, reactToNope } from "@/lib/api/nope";

const NOPE_QUERY_KEY = ["nope"] as const;

export function useNopeListQuery() {
  return useQuery({
    queryKey: NOPE_QUERY_KEY,
    queryFn: fetchNopes,
  });
}

export function useCreateNopeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNope,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOPE_QUERY_KEY }),
  });
}

export function useDeleteNopeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNope,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOPE_QUERY_KEY }),
  });
}

export function useClearNopesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearNopes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOPE_QUERY_KEY }),
  });
}

export function useReactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactToNope,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOPE_QUERY_KEY }),
  });
}
