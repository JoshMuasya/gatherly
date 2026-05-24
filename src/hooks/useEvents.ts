import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Events } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

interface EventsResponse {
  events: Events[];
  nextCursor: string | null;
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () => api.get<EventsResponse>("/api/events"),
    staleTime: 30_000,

    enabled: !!auth.currentUser,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Events, "id" | "createdAt" | "attendeesCount">) =>
      api.post<Events>("/api/events", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Events> & { id: string }) =>
      api.patch<{ updated: boolean }>(`/api/events/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/api/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<{ registrationId: string }>(`/api/events/${eventId}/register`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
