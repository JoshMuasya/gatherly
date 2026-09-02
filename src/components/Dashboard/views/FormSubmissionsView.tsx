"use client"

import { useMemo, useState } from 'react';
import { Download, Users, CreditCard, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '../StatCard';
import { RecordSubmissionPaymentDialog } from '../RecordSubmissionPaymentDialog';
import { useEvents } from '@/hooks/useEvents';
import { useEventForm, useFormSubmissions, FormSubmissionWithBalance } from '@/hooks/useForms';
import { exportCSV } from '@/lib/exportCsv';
import { FormField } from '@/lib/types';

function formatAnswer(value: string | string[] | undefined): string {
  if (value === undefined) return '—';
  return Array.isArray(value) ? value.join(', ') : value;
}

export function FormSubmissionsView() {
  const { data: eventsData, isLoading: loadingEvents } = useEvents();
  const allEvents = useMemo(() => eventsData?.events ?? [], [eventsData]);

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [payingSubmissionId, setPayingSubmissionId] = useState<string | null>(null);

  const { data: formData, isLoading: loadingForm } = useEventForm(selectedEventId || undefined);
  const form = formData?.form ?? null;

  const { data: submissionsData, isLoading: loadingSubmissions } = useFormSubmissions(form?.id);
  const submissions = submissionsData?.submissions ?? [];
  const fields = form?.fields ?? [];
  const summary = submissionsData?.summary;

  const isLoading = loadingForm || loadingSubmissions;
  const columnCount = fields.length + 3; // fields + Paid + Balance + Submitted (Actions column excluded from colSpan on purpose — see below)

  const selectedEvent = allEvents.find(e => e.id === selectedEventId);
  const payingSubmission = submissions.find(s => s.id === payingSubmissionId) ?? null;

  const handleExport = () => {
    const header = [...fields.map((f: FormField) => f.label), 'Paid', 'Balance', 'Submitted'];
    const rows = submissions.map((sub: FormSubmissionWithBalance) => [
      ...fields.map((f: FormField) => formatAnswer(sub.answers[f.id])),
      String(sub.amountPaid),
      String(sub.balance),
      sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
    ]);
    const eventSlug = (selectedEvent?.title ?? 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    exportCSV(`${eventSlug}-submissions.csv`, [header, ...rows]);
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Form Submissions</h1>
        <p className="text-muted-foreground mt-1">Responses collected from your event forms</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="w-full sm:w-72">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingEvents ? 'Loading events...' : 'Select an event'} />
            </SelectTrigger>
            <SelectContent>
              {allEvents.map(event => (
                <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form && submissions.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to CSV (opens in Sheets)
          </Button>
        )}
      </div>

      {!selectedEventId ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">Select an event to view its form submissions</p>
        </div>
      ) : !isLoading && !form ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">This event doesn&apos;t have a form yet</p>
          <p className="text-sm mt-1">Create one from the event&apos;s edit dialog</p>
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Registered" value={summary.totalSubmissions} icon={Users} variant="primary" />
              <StatCard title="Collected" value={`KSh ${summary.totalPaid.toLocaleString()}`} icon={CreditCard} variant="accent" />
              <StatCard
                title="Balance Outstanding"
                value={summary.totalBalance < 0 ? `Overpaid KSh ${Math.abs(summary.totalBalance).toLocaleString()}` : `KSh ${summary.totalBalance.toLocaleString()}`}
                icon={Wallet}
                variant={summary.totalBalance > 0 ? 'secondary' : 'default'}
              />
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map(field => (
                      <TableHead key={field.id}>{field.label}</TableHead>
                    ))}
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: columnCount + 1 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnCount + 1} className="text-center py-6 text-muted-foreground">
                        No submissions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map(sub => (
                      <TableRow key={sub.id}>
                        {fields.map(field => (
                          <TableCell key={field.id}>{formatAnswer(sub.answers[field.id])}</TableCell>
                        ))}
                        <TableCell>KSh {sub.amountPaid.toLocaleString()}</TableCell>
                        <TableCell>
                          {sub.balance <= 0 ? (
                            <Badge variant={sub.balance < 0 ? 'secondary' : 'default'}>
                              {sub.balance < 0 ? `Overpaid KSh ${Math.abs(sub.balance).toLocaleString()}` : 'Paid'}
                            </Badge>
                          ) : (
                            <span>KSh {sub.balance.toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setPayingSubmissionId(sub.id)}>
                            <Wallet className="h-4 w-4 mr-1.5" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {form && (
        <RecordSubmissionPaymentDialog
          key={payingSubmissionId ?? 'closed'}
          formId={form.id}
          submissionId={payingSubmissionId}
          currentBalance={payingSubmission?.balance ?? 0}
          onClose={() => setPayingSubmissionId(null)}
        />
      )}
    </div>
  );
}
