"use client"

import { Calendar, Users, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/lib/context/AppContext';
import { StatCard } from '../StatCard';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '../EventCard';
import { useMemo, useState } from 'react';
import { Events, TicketData } from '@/lib/types';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TicketDialog } from '@/components/Tickets/TicketDialog';
import { PaymentDialog } from '@/components/Dashboard/PaymentDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents, useRegisterForEvent } from '@/hooks/useEvents';
import { useRegistrations } from '@/hooks/useRegistrations';
import { usePayments } from '@/hooks/usePayments';
import { useUsers } from '@/hooks/useUsers';

export function DashboardOverview() {
    const { currentUser, isAuthLoading } = useApp();
    const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);

    const isAdminLeader = currentUser?.role === "Admin" || currentUser?.role === "Leader" || currentUser?.role === "SuperAdmin";

    const { data: eventsData, isLoading: loadingEvents } = useEvents();
    const { data: regsData, isLoading: loadingRegs } = useRegistrations();
    const { data: paymentsData } = usePayments();
    const { data: usersData } = useUsers();
    const registerForEvent = useRegisterForEvent();

    const allEvents = eventsData?.events ?? [];
    const allRegistrations = regsData?.registrations ?? [];
    const allPayments = paymentsData?.payments ?? [];
    const allUsers = usersData ?? [];

    const upcomingEvents = allEvents.filter(e => new Date(e.date) > new Date());

    const paidEventIds = useMemo(() => allPayments.map(p => p.eventId), [allPayments]);

    const paymentMap = useMemo(() => {
        return allPayments.reduce((acc, p) => {
            acc[`${p.userId}_${p.eventId}`] = true;
            return acc;
        }, {} as Record<string, boolean>);
    }, [allPayments]);

    const enrichedRegistrations = useMemo(() =>
        allRegistrations.map(reg => {
            const event = allEvents.find(e => e.id === reg.eventId);
            const isFree = !event?.price || event.price === 0;
            const paymentStatus: "paid" | "pending" | "free" =
                isFree ? "free" : paymentMap[`${reg.userId}_${reg.eventId}`] ? "paid" : "pending";
            return { ...reg, eventTitle: event?.title ?? "Unknown Event", paymentStatus };
        }), [allRegistrations, allEvents, paymentMap]);

    const getUserRegistration = (eventId: string) =>
        allRegistrations.find(r => r.eventId === eventId && r.userId === currentUser?.id);

    const handleRegister = async () => {
        if (!selectedEvent) return;
        try {
            await registerForEvent.mutateAsync(selectedEvent.id);
            setRegisterOpen(false);
            setRegisterSuccess(true);
            toast.success("Successfully registered for the event");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Registration failed");
        }
    };

    const isLoading = loadingEvents || loadingRegs;

    if (isAuthLoading) return (
        <div className="space-y-6 w-full">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
        </div>
    );

    if (!currentUser) return <div className="p-6 text-muted-foreground">Please log in to continue.</div>;

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                    Welcome back, {currentUser.name.split(' ')[0]}!
                </h1>
                <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)
                ) : (
                    <>
                        <StatCard title="Total Events" value={allEvents.length} icon={Calendar} variant="primary"
                            change={`Upcoming: ${upcomingEvents.length}`} />
                        <StatCard title="Registrations" value={allRegistrations.length} icon={Users} variant="accent"
                            change={isAdminLeader
                                ? `Paid: ${enrichedRegistrations.filter(r => r.paymentStatus === 'paid').length} | Free: ${enrichedRegistrations.filter(r => r.paymentStatus === 'free').length}`
                                : undefined}
                        />
                        {isAdminLeader ? (
                            <>
                                <StatCard title="Revenue" value={`KSh ${totalRevenue.toLocaleString()}`} icon={CreditCard} variant="secondary"
                                    change={`Pending: ${enrichedRegistrations.filter(r => r.paymentStatus === 'pending').length}`} />
                                <StatCard title="Users" value={allUsers.length} icon={TrendingUp} variant="default"
                                    change={`Youth: ${allUsers.filter(u => u.role === 'Youth').length} | Leaders: ${allUsers.filter(u => u.role === 'Leader').length}`} />
                            </>
                        ) : (
                            <>
                                <StatCard title="Upcoming Events" value={upcomingEvents.length} icon={TrendingUp} variant="secondary" />
                                <StatCard title="My Registrations" value={enrichedRegistrations.filter(r => r.userId === currentUser.id).length} icon={Users} variant="accent" />
                            </>
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-display font-semibold text-foreground text-lg">Upcoming Events</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading
                            ? [1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)
                            : upcomingEvents.slice(0, 4).map(event => {
                                const hasPaid = paidEventIds.includes(event.id);
                                return (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        userRole={currentUser.role}
                                        isRegistered={!!getUserRegistration(event.id)}
                                        onRegister={() => { setSelectedEvent(event); setRegisterOpen(true); }}
                                        onPay={!hasPaid && event.price > 0 ? () => { setSelectedEvent(event); setPayDialogOpen(true); } : undefined}
                                        canPrintTicket={event.price === 0 || hasPaid}
                                        onPrintTicket={() => {
                                            const reg = getUserRegistration(event.id);
                                            if (!reg) { toast.error("You are not registered for this event"); return; }
                                            setTicketData({
                                                registrationId: reg.id, eventId: event.id, eventTitle: event.title,
                                                date: event.date, time: event.time, location: event.location,
                                                name: reg.name || currentUser.name, email: reg.email || currentUser.email,
                                            });
                                        }}
                                    />
                                );
                            })}
                    </div>
                </div>

                {isAdminLeader && (
                    <div className="space-y-4">
                        <h2 className="font-display font-semibold text-foreground text-lg">Recent Registrations</h2>
                        <Card>
                            <CardContent className="p-0">
                                {loadingRegs ? (
                                    <div className="p-4 space-y-3">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                                    </div>
                                ) : enrichedRegistrations.length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground">No registrations yet</p>
                                ) : (
                                    enrichedRegistrations
                                        .sort((a, b) => new Date(b.registeredAt ?? 0).getTime() - new Date(a.registeredAt ?? 0).getTime())
                                        .slice(0, 5)
                                        .map((reg, i) => (
                                            <div key={reg.id} className={`flex items-center justify-between p-4 ${i !== 0 ? 'border-t' : ''}`}>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{reg.name}</p>
                                                    <p className="text-xs text-muted-foreground">{reg.eventTitle}</p>
                                                </div>
                                                <Badge variant={reg.paymentStatus === 'paid' ? 'default' : reg.paymentStatus === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                                                    {reg.paymentStatus === 'free' ? 'Free' : reg.paymentStatus}
                                                </Badge>
                                            </div>
                                        ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogContent className="w-md">
                    <DialogHeader><DialogTitle>Register for Event</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">
                        Are you sure you want to register for <span className="font-semibold">{selectedEvent?.title}</span>?
                    </p>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
                        <Button onClick={handleRegister} disabled={registerForEvent.isPending} className="flex items-center gap-2">
                            {registerForEvent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {registerForEvent.isPending ? "Registering..." : "Confirm Registration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={registerSuccess} onOpenChange={setRegisterSuccess}>
                <DialogContent className="w-md text-center">
                    <DialogHeader><DialogTitle>Registration Successful!</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">You have successfully registered for the event.</p>
                    <DialogFooter className="mt-4"><Button onClick={() => setRegisterSuccess(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {ticketData && <TicketDialog data={ticketData} open={!!ticketData} onClose={() => setTicketData(null)} />}
            {selectedEvent && (
                <PaymentDialog
                    event={selectedEvent}
                    open={payDialogOpen}
                    onClose={() => { setPayDialogOpen(false); setSelectedEvent(null); }}
                />
            )}
        </div>
    );
}
