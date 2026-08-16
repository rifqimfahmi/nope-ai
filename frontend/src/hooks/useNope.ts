import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchNopes, fetchTopNopes, reactToNope } from "@/lib/api/nope";

const NOPE_QUERY_KEY = ["nope"] as const;

export function useNopeListQuery() {
  return useQuery({
    queryKey: NOPE_QUERY_KEY,
    queryFn: fetchNopes,
  });
}

export function useTopNopesQuery(limit = 5) {
  return useQuery({
    queryKey: [...NOPE_QUERY_KEY, "top", limit],
    queryFn: () => fetchTopNopes(limit),
  });
}

export function useReactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactToNope,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOPE_QUERY_KEY }),
  });
}
