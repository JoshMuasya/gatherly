import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Payment } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

interface PaymentsResponse {
  payments: Payment[];
}

export function usePayments(userId?: string, eventId?: string, limit?: number) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (eventId) params.set("eventId", eventId);
  if (limit) params.set("limit", String(limit));
  const url = `/api/payments${params.size ? `?${params}` : ""}`;

  return useQuery({
    queryKey: ["payments", userId ?? "all", eventId ?? "all", limit ?? 100],
    queryFn: () => api.get<PaymentsResponse>(url),
    staleTime: 30_000,
    enabled: !!auth.currentUser,
  });
}

interface RecordPaymentInput {
  eventId: string;
  userId: string;
  userName: string;
  amount: number;
  method: "cash" | "mpesa";
  mpesaCode?: string;
  cashReceivedBy?: string;
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentInput) =>
      api.post<{ paymentId: string; message: string }>("/api/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["registrations"] });
    },
  });
}
