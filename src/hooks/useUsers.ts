import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { User } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/api/users"),
    staleTime: 60_000,

    enabled: !!auth.currentUser,
  });
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      api.post<{ message: string; resetLink: string; email: string }>("/api/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<User> & { id: string }) =>
      api.patch<{ updated: boolean }>(`/api/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; role: string }) =>
      api.post<{ message: string }>("/api/users/invite", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
