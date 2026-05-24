import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Registration } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

interface RegistrationsResponse {
  registrations: Registration[];
  nextCursor: string | null;
}

export function useRegistrations(eventId?: string, limit?: number) {
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  if (limit) params.set("limit", String(limit));
  const url = `/api/registrations${params.size ? `?${params}` : ""}`;

  return useQuery({
    queryKey: ["registrations", eventId ?? "all", limit ?? 100],
    queryFn: () => api.get<RegistrationsResponse>(url),
    staleTime: 30_000,
    enabled: !!auth.currentUser,
  });
}

export function useCancelRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, eventId }: { userId: string; eventId: string }) =>
      api.delete<{ cancelled: boolean }>("/api/registrations/cancel", {
        body: { userId, eventId },
      } as Parameters<typeof api.delete>[1]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registrations"] }),
  });
}
