import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearHistory,
  createHistoryItem,
  deleteHistoryItem,
  fetchHistory,
} from "@/lib/api/history";

const HISTORY_QUERY_KEY = ["history"] as const;

export function useHistoryQuery() {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: fetchHistory,
  });
}

export function useCreateHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHistoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY }),
  });
}

export function useDeleteHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHistoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY }),
  });
}

export function useClearHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY }),
  });
}
