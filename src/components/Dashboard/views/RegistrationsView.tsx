"use client"

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/lib/context/AppContext';
import { useMemo } from 'react';
import { useRegistrations } from '@/hooks/useRegistrations';
import { usePayments } from '@/hooks/usePayments';
import { useEvents } from '@/hooks/useEvents';

export function RegistrationsView() {
    const { currentUser } = useApp();
    const isYouth = currentUser?.role === 'Youth';

    const { data: regsData, isLoading: loadingRegs } = useRegistrations();
    const { data: paymentsData, isLoading: loadingPayments } = usePayments();
    const { data: eventsData, isLoading: loadingEvents } = useEvents();

    const isLoading = loadingRegs || loadingPayments || loadingEvents;

    const allRegistrations = regsData?.registrations ?? [];
    const allPayments = paymentsData?.payments ?? [];
    const allEvents = eventsData?.events ?? [];

    const paymentMap = useMemo(() =>
        allPayments.reduce((acc, p) => {
            acc[`${p.userId}_${p.eventId}`] = true;
            return acc;
        }, {} as Record<string, boolean>),
        [allPayments]
    );

    const enrichedRegistrations = useMemo(() =>
        allRegistrations
            .filter(reg => isYouth ? reg.userId === currentUser?.id : true)
            .map(reg => {
                const event = allEvents.find(e => e.id === reg.eventId);
                const isFree = !event?.price || event.price === 0;
                const paymentStatus: "paid" | "pending" | "free" =
                    isFree ? "free" : paymentMap[`${reg.userId}_${reg.eventId}`] ? "paid" : "pending";
                return { ...reg, eventTitle: event?.title ?? reg.eventTitle ?? "Unknown Event", paymentStatus };
            }),
        [allRegistrations, allEvents, paymentMap, isYouth, currentUser?.id]
    );

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                    {isYouth ? 'My Registrations' : 'Registrations'}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {isYouth ? "Events you've registered for" : "All event registrations"}
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {!isYouth && <TableHead>Name</TableHead>}
                                <TableHead>Event</TableHead>
                                <TableHead>Date Registered</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: isYouth ? 3 : 4 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : enrichedRegistrations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isYouth ? 3 : 4} className="text-center py-6 text-muted-foreground">
                                        No registrations found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrichedRegistrations.map(reg => (
                                    <TableRow key={reg.id}>
                                        {!isYouth && <TableCell className="font-medium">{reg.name}</TableCell>}
                                        <TableCell>{reg.eventTitle}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                reg.paymentStatus === 'paid' ? 'default' :
                                                reg.paymentStatus === 'pending' ? 'secondary' : 'outline'
                                            }>
                                                {reg.paymentStatus === 'free' ? 'Free' : reg.paymentStatus}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
