"use client"

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Users, Calendar, CreditCard, TrendingUp, Building2 } from 'lucide-react';
import { StatCard } from '../StatCard';
import { useEvents } from '@/hooks/useEvents';
import { useRegistrations } from '@/hooks/useRegistrations';
import { usePayments } from '@/hooks/usePayments';
import { useApp } from '@/lib/context/AppContext';
import { exportCSV } from '@/lib/exportCsv';

export function ReportsView() {
    const { currentUser } = useApp();
    const isAdminOrAbove = ['Admin', 'Owner', 'SuperAdmin', 'Treasurer'].includes(currentUser?.role ?? '');

    // Fetch up to 500 records for complete org-wide reporting
    const { data: eventsData, isLoading: loadingEvents } = useEvents();
    const { data: regsData, isLoading: loadingRegs } = useRegistrations(undefined, 500);
    const { data: paymentsData, isLoading: loadingPayments } = usePayments(undefined, undefined, 500);

    const isLoading = loadingEvents || loadingRegs || loadingPayments;

    const allEvents = eventsData?.events ?? [];
    const allRegistrations = regsData?.registrations ?? [];
    const allPayments = paymentsData?.payments ?? [];

    const totalRevenue = useMemo(() => allPayments.reduce((s, p) => s + p.amount, 0), [allPayments]);

    const upcomingCount = useMemo(
        () => allEvents.filter(e => new Date(e.date) > new Date()).length,
        [allEvents]
    );

    const paymentMap = useMemo(() =>
        allPayments.reduce((acc, p) => {
            acc[`${p.userId}_${p.eventId}`] = p.amount;
            return acc;
        }, {} as Record<string, number>),
        [allPayments]
    );

    const eventStats = useMemo(() =>
        allEvents.map(event => {
            const regs = allRegistrations.filter(r => r.eventId === event.id);
            const revenue = regs.reduce((sum, r) => sum + (paymentMap[`${r.userId}_${event.id}`] ?? 0), 0);
            const attendanceRate = event.maxAttendees > 0
                ? Math.round((regs.length / event.maxAttendees) * 100)
                : null;
            return { event, regCount: regs.length, revenue, attendanceRate };
        }).sort((a, b) => b.regCount - a.regCount),
        [allEvents, allRegistrations, paymentMap]
    );

    const handleExportEvents = () => {
        const header = ['Event Title', 'Date', 'Location', 'Max Attendees', 'Registered', 'Revenue (KSh)', 'Attendance %'];
        const rows = eventStats.map(({ event, regCount, revenue, attendanceRate }) => [
            event.title, event.date, event.location,
            event.maxAttendees > 0 ? String(event.maxAttendees) : 'Unlimited', String(regCount),
            String(revenue), attendanceRate !== null ? String(attendanceRate) : 'N/A',
        ]);
        exportCSV('events-report.csv', [header, ...rows]);
    };

    const handleExportRegistrations = () => {
        const header = ['Name', 'Event', 'Registered At', 'Payment Status'];
        const rows = allRegistrations.map(r => {
            const event = allEvents.find(e => e.id === r.eventId);
            const isFree = !event?.price || event.price === 0;
            const paid = paymentMap[`${r.userId}_${r.eventId}`] != null;
            const status = isFree ? 'Free' : paid ? 'Paid' : 'Pending';
            return [r.name, event?.title ?? r.eventTitle ?? 'Unknown', r.registeredAt ?? '', status];
        });
        exportCSV('registrations-report.csv', [header, ...rows]);
    };

    const handleExportPayments = () => {
        const header = ['Name', 'Event', 'Amount (KSh)', 'Method', 'Date'];
        const rows = allPayments.map(p => {
            const event = allEvents.find(e => e.id === p.eventId);
            return [p.userName, event?.title ?? p.eventTitle ?? 'Unknown',
                String(p.amount), p.method, p.paymentDate];
        });
        exportCSV('payments-report.csv', [header, ...rows]);
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Reports</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">Analytics and data exports</p>
                        {isAdminOrAbove && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                <Building2 className="h-3 w-3" />
                                All Organisation Data
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" size="sm" onClick={handleExportEvents} disabled={isLoading}>
                        <Download className="h-4 w-4 mr-2" /> Events CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportRegistrations} disabled={isLoading}>
                        <Download className="h-4 w-4 mr-2" /> Registrations CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPayments} disabled={isLoading}>
                        <Download className="h-4 w-4 mr-2" /> Payments CSV
                    </Button>
                </div>
            </div>

            {/* Summary stats */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Events" value={allEvents.length} icon={Calendar} variant="primary"
                        change={`${upcomingCount} upcoming`} />
                    <StatCard title="Total Registrations" value={allRegistrations.length} icon={Users} variant="accent" />
                    <StatCard title="Total Revenue" value={`KSh ${totalRevenue.toLocaleString()}`} icon={CreditCard} variant="secondary"
                        change={`${allPayments.length} transactions`} />
                    <StatCard title="Avg. Registrations/Event"
                        value={allEvents.length > 0 ? (allRegistrations.length / allEvents.length).toFixed(1) : '0'}
                        icon={TrendingUp} variant="default" />
                </div>
            )}

            {/* Event performance table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Event Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Registrations</TableHead>
                                <TableHead>Revenue</TableHead>
                                <TableHead>Capacity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : eventStats.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                        No events found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                eventStats.map(({ event, regCount, revenue, attendanceRate }) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.title}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(event.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{regCount}</TableCell>
                                        <TableCell>
                                            {revenue > 0 ? `KSh ${revenue.toLocaleString()}` : (
                                                <span className="text-muted-foreground text-sm">Free</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {attendanceRate !== null ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">{attendanceRate}%</span>
                                                </div>
                                            ) : (
                                                <Badge variant="outline">Unlimited</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Top paying events */}
            {!isLoading && allPayments.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Revenue by Event</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {eventStats
                            .filter(s => s.revenue > 0)
                            .slice(0, 5)
                            .map(({ event, revenue }) => {
                                const pct = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
                                return (
                                    <div key={event.id} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium truncate max-w-xs">{event.title}</span>
                                            <span className="text-muted-foreground ml-4 shrink-0">
                                                KSh {revenue.toLocaleString()} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
