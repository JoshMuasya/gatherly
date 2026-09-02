import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { FormField } from "@/lib/types";

export type PublicFormResponse =
  | { status: "inactive" }
  | {
      status: "active";
      id: string;
      title: string;
      description?: string;
      eventTitle?: string;
      fields: FormField[];
    };

export function usePublicForm(formId: string) {
  return useQuery({
    queryKey: ["public-form", formId],
    queryFn: () => api.get<PublicFormResponse>(`/api/public/forms/${formId}`, { skipAuth: true }),
    retry: false,
  });
}

export function useSubmitPublicForm(formId: string) {
  return useMutation({
    mutationFn: (answers: Record<string, string | string[]>) =>
      api.post<{ submitted: boolean }>(`/api/public/forms/${formId}/submit`, answers, { skipAuth: true }),
  });
}
