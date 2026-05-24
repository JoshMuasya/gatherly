'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { StatCard } from '../StatCard';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PaymentDialog } from '../PaymentDialog';
import { EventCard } from '../EventCard';
import { Events, TicketData, UserRole } from '@/lib/types';
import { useApp } from '@/lib/context/AppContext';
import { toast } from 'sonner';
import { TicketDialog } from '@/components/Tickets/TicketDialog';
import { useEvents } from '@/hooks/useEvents';
import { useRegistrations, useCancelRegistration } from '@/hooks/useRegistrations';
import { usePayments } from '@/hooks/usePayments';
import { api } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    userRole: UserRole;
}

const ITEMS_PER_PAGE = 10;

function PaymentStatusBadge({ status }: { status: string }) {
    if (status === 'approved') return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
    if (status === 'pending_approval') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Awaiting Approval</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
    return <Badge variant="outline">{status}</Badge>;
}

export function PaymentsView({ userRole }: Props) {
    const { currentUser } = useApp();
    const qc = useQueryClient();
    const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rejectDialogPaymentId, setRejectDialogPaymentId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [reviewLoading, setReviewLoading] = useState<string | null>(null);

    const isAdminOrLeader = ['Admin', 'Leader', 'SuperAdmin'].includes(userRole);

    const { data: eventsData, isLoading: loadingEvents } = useEvents();
    const { data: regsData, isLoading: loadingRegs } = useRegistrations();
    const { data: paymentsData, isLoading: loadingPayments } = usePayments(
        isAdminOrLeader ? undefined : currentUser?.id
    );
    const cancelRegistration = useCancelRegistration();

    const allEvents = eventsData?.events ?? [];
    const allRegistrations = regsData?.registrations ?? [];
    const allPayments = paymentsData?.payments ?? [];

    const isLoading = loadingEvents || loadingRegs || loadingPayments;

    const approvedPayments = useMemo(() => allPayments.filter(p => p.paymentStatus === 'approved'), [allPayments]);
    const pendingPayments = useMemo(() => allPayments.filter(p => p.paymentStatus === 'pending_approval'), [allPayments]);

    const totalRevenue = useMemo(
        () => approvedPayments.reduce((sum, p) => sum + p.amount, 0),
        [approvedPayments]
    );

    const paidEventIds = useMemo(() => {
        if (!currentUser) return [];
        return approvedPayments.filter(p => p.userId === currentUser.id).map(p => p.eventId);
    }, [approvedPayments, currentUser]);

    const registeredEventsForCards = useMemo(() => {
        if (!currentUser) return [];
        return allEvents
            .filter(event => allRegistrations.some(r => r.eventId === event.id && r.userId === currentUser.id))
            .map(event => {
                const reg = allRegistrations.find(r => r.eventId === event.id && r.userId === currentUser.id);
                return { ...event, registrationId: reg?.id };
            });
    }, [allEvents, allRegistrations, currentUser]);

    const totalPages = Math.ceil(allPayments.length / ITEMS_PER_PAGE);
    const paginatedPayments = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return allPayments.slice(start, start + ITEMS_PER_PAGE);
    }, [currentPage, allPayments]);

    const handleCancelRegistration = async (eventId: string) => {
        if (!currentUser?.id) return;
        try {
            await cancelRegistration.mutateAsync({ userId: currentUser.id, eventId });
            toast.success("Registration cancelled");
        } catch {
            toast.error("Failed to cancel registration");
        }
    };

    const handleApprove = async (paymentId: string) => {
        setReviewLoading(paymentId);
        try {
            await api.patch(`/api/payments/${paymentId}`, { action: 'approve' });
            await qc.invalidateQueries({ queryKey: ['payments'] });
            await qc.invalidateQueries({ queryKey: ['registrations'] });
            toast.success('Payment approved');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to approve payment');
        } finally {
            setReviewLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectDialogPaymentId || !rejectionReason.trim()) return;
        setReviewLoading(rejectDialogPaymentId);
        try {
            await api.patch(`/api/payments/${rejectDialogPaymentId}`, {
                action: 'reject',
                rejectionReason: rejectionReason.trim(),
            });
            await qc.invalidateQueries({ queryKey: ['payments'] });
            toast.success('Payment rejected');
            setRejectDialogPaymentId(null);
            setRejectionReason('');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to reject payment');
        } finally {
            setReviewLoading(null);
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold">Payments</h1>
                <p className="text-muted-foreground">Track payments and registered events</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard title="Total Revenue" value={`Ksh ${totalRevenue.toLocaleString()}`} icon={DollarSign} variant="primary" />
                    <StatCard title="Transactions" value={approvedPayments.length} icon={CreditCard} variant="accent" />
                    {isAdminOrLeader && pendingPayments.length > 0 && (
                        <StatCard title="Awaiting Approval" value={pendingPayments.length} icon={Clock} variant="accent" />
                    )}
                </div>
            )}

            {/* Pending Approvals — Leaders/Admins only */}
            {isAdminOrLeader && (
                <div>
                    <h2 className="font-display font-semibold text-foreground text-lg mb-4">
                        Pending Approvals
                        {pendingPayments.length > 0 && (
                            <Badge className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-200">
                                {pendingPayments.length}
                            </Badge>
                        )}
                    </h2>
                    {isLoading ? (
                        <Card><CardContent className="p-4 space-y-3">
                            {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                        </CardContent></Card>
                    ) : pendingPayments.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No payments awaiting approval.</p>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>M-Pesa Code</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPayments.map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">{payment.userName}</TableCell>
                                                <TableCell className="text-muted-foreground">{payment.eventTitle || allEvents.find(e => e.id === payment.eventId)?.title || 'Unknown'}</TableCell>
                                                <TableCell>Ksh {payment.amount.toLocaleString()}</TableCell>
                                                <TableCell className="font-mono text-sm">{payment.mpesaCode ?? '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white h-7"
                                                            onClick={() => handleApprove(payment.id)}
                                                            disabled={reviewLoading === payment.id}
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-red-200 text-red-600 hover:bg-red-50 h-7"
                                                            onClick={() => { setRejectDialogPaymentId(payment.id); setRejectionReason(''); }}
                                                            disabled={reviewLoading === payment.id}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Registered Events */}
            <div>
                <h2 className="font-display font-semibold text-foreground text-lg mb-4">My Registered Events</h2>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                    </div>
                ) : registeredEventsForCards.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">No registered events found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {registeredEventsForCards.map(event => {
                            const hasPaid = paidEventIds.includes(event.id);
                            const hasPending = allPayments.some(
                                p => p.eventId === event.id && p.userId === currentUser?.id && p.paymentStatus === 'pending_approval'
                            );
                            return (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    userRole={currentUser?.role ?? 'Youth'}
                                    showAdminActions={false}
                                    isRegistered
                                    onCancelRegistration={() => handleCancelRegistration(event.id)}
                                    onPay={!hasPaid && !hasPending && event.price > 0 ? () => setSelectedEvent(event) : undefined}
                                    canPrintTicket={event.price === 0 || hasPaid}
                                    onPrintTicket={() => {
                                        if (!event.registrationId) { toast.error("Registration not found"); return; }
                                        setTicketData({
                                            registrationId: event.registrationId,
                                            eventId: event.id,
                                            eventTitle: event.title,
                                            date: event.date,
                                            time: event.time,
                                            location: event.location,
                                            name: currentUser?.name ?? '',
                                            email: currentUser?.email ?? '',
                                        });
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Payment History */}
            <div>
                <h2 className="font-display font-semibold text-foreground text-lg mb-4">Payment History</h2>
                {isLoading ? (
                    <Card><CardContent className="p-4 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </CardContent></Card>
                ) : allPayments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">No payments found.</p>
                ) : (
                    <>
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedPayments.map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">{payment.userName}</TableCell>
                                                <TableCell className="text-muted-foreground">{payment.eventTitle || allEvents.find(e => e.id === payment.eventId)?.title || "Unknown Event"}</TableCell>
                                                <TableCell>Ksh {payment.amount.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">{payment.method}</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <PaymentStatusBadge status={payment.paymentStatus ?? 'approved'} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        {totalPages > 1 && (
                            <div className="flex justify-end items-center gap-2 mt-4">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedEvent && (
                <PaymentDialog
                    event={selectedEvent}
                    open={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}

            {ticketData && (
                <TicketDialog data={ticketData} open={!!ticketData} onClose={() => setTicketData(null)} />
            )}

            {/* Reject reason dialog */}
            <Dialog open={!!rejectDialogPaymentId} onOpenChange={() => { setRejectDialogPaymentId(null); setRejectionReason(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Reason for rejection</Label>
                            <Input
                                placeholder="e.g. Invalid M-Pesa code, amount mismatch..."
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => { setRejectDialogPaymentId(null); setRejectionReason(''); }}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || !!reviewLoading}
                            >
                                Reject Payment
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
