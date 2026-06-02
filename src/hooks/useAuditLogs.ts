import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { AuditLog } from "@/lib/types";
import { auth } from "@/lib/firebase/firebase";

interface AuditLogsResponse {
  logs: AuditLog[];
}

export function useAuditLogs(actionCategory?: string, limit?: number) {
  const params = new URLSearchParams();
  if (actionCategory) params.set("action", actionCategory);
  if (limit) params.set("limit", String(limit));
  const url = `/api/audit-logs${params.size ? `?${params}` : ""}`;

  return useQuery({
    queryKey: ["audit-logs", actionCategory ?? "all", limit ?? 100],
    queryFn: () => api.get<AuditLogsResponse>(url),
    staleTime: 30_000,
    enabled: !!auth.currentUser,
  });
}
