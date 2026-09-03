import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { FormDefinition, FormField, FormSubmission } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

export function useEventForm(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-form", eventId],
    queryFn: () => api.get<{ form: FormDefinition | null }>(`/api/events/${eventId}/form`),
    enabled: !!auth.currentUser && !!eventId,
  });
}

export function useCreateForm(eventId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; fields: FormField[] }) =>
      api.post<{ form: FormDefinition }>(`/api/events/${eventId}/form`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-form", eventId] }),
  });
}

export function useUpdateForm(eventId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; description?: string; fields?: FormField[]; isActive?: boolean }) =>
      api.patch<{ updated: boolean }>(`/api/events/${eventId}/form`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-form", eventId] }),
  });
}

export interface FormSubmissionWithBalance extends FormSubmission {
  amountPaid: number;
  balance: number;
}

interface FormSubmissionsResponse {
  form: { id: string; title: string; fields: FormField[] };
  submissions: FormSubmissionWithBalance[];
  nextCursor: string | null;
  amountDue: number;
  summary: {
    totalSubmissions: number;
    totalPaid: number;
    totalBalance: number;
  };
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-submissions", formId],
    queryFn: () => api.get<FormSubmissionsResponse>(`/api/forms/${formId}/submissions`),
    enabled: !!auth.currentUser && !!formId,
  });
}

interface RecordSubmissionPaymentInput {
  submissionId: string;
  amount: number;
  method: "cash" | "mpesa";
  mpesaCode?: string;
  cashReceivedBy?: string;
}

export function useRecordSubmissionPayment(formId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, ...data }: RecordSubmissionPaymentInput) =>
      api.post<{ payment: unknown }>(`/api/forms/${formId}/submissions/${submissionId}/payments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form-submissions", formId] }),
  });
}

export interface AnonymousResponseSummary {
  id: string;
  fieldId: string;
  fieldLabel: string;
  answer: string;
  submittedDate: string;
}

export function useAnonymousResponses(formId: string | undefined) {
  return useQuery({
    queryKey: ["form-anonymous-responses", formId],
    queryFn: () => api.get<{ responses: AnonymousResponseSummary[] }>(`/api/forms/${formId}/anonymous-responses`),
    enabled: !!auth.currentUser && !!formId,
  });
}
