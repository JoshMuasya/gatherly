"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, Shield } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLog } from '@/lib/types';

const ACTION_CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'org', label: 'Organisation' },
  { value: 'user', label: 'Users' },
  { value: 'event', label: 'Events' },
  { value: 'registration', label: 'Registrations' },
  { value: 'payment', label: 'Payments' },
  { value: 'checkin', label: 'Check-ins' },
];

const CATEGORY_STYLES: Record<string, string> = {
  org: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  user: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  event: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  registration: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  payment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  checkin: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

function getCategory(action: string): string {
  return action.split('.')[0];
}

function formatAction(action: string): string {
  const [category, ...rest] = action.split('.');
  const verb = rest.join('.');
  const cat = category.charAt(0).toUpperCase() + category.slice(1);
  const v = verb ? verb.charAt(0).toUpperCase() + verb.slice(1) : '';
  return v ? `${cat} › ${v}` : cat;
}

function getDetails(log: AuditLog): string {
  if (log.metadata) {
    const priority = ['title', 'name', 'userName', 'email', 'role', 'amount', 'reason', 'eventTitle'];
    for (const key of priority) {
      if (log.metadata[key] != null) return String(log.metadata[key]);
    }
  }
  return log.targetId ?? '—';
}

export function AuditLogsView() {
  const [category, setCategory] = useState('all');
  const { data, isLoading } = useAuditLogs(category === 'all' ? undefined : category);
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Audit Logs</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">Activity history for your organisation</p>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Leadership Only
            </Badge>
          </div>
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Activity Log
            {!isLoading && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Time</TableHead>
                <TableHead className="w-52">Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const cat = getCategory(log.action);
                  const style = CATEGORY_STYLES[cat] ?? 'bg-muted text-muted-foreground';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
                        >
                          {formatAction(log.action)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {log.actorName ?? log.actorId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {getDetails(log)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
