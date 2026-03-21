"use client"

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useApp } from '@/lib/context/AppContext';
import { auth } from '@/lib/firebase/firebase';
import { Events, Payment } from '@/lib/types';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function RegistrationsView() {
    const { currentUser } = useApp();
    const [loading, setLoading] = useState(false);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [events, setEvents] = useState<Events[]>([]);
    const [registeredEvents, setRegisteredEvents] = useState<Record<string, boolean>>({});

    // Check if registered
    const checkRegistration = async (eventId: string) => {
        if (!auth.currentUser) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/events/${eventId}/check-registration`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setRegisteredEvents(prev => ({
                    ...prev,
                    [eventId]: data.isRegistered
                }));
            }
        } catch (err) {
            console.error("Failed to check registration");
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/events");
                if (!res.ok) throw new Error("Failed to fetch events");
                const data = await res.json();
                setEvents(data.events);

                if (auth.currentUser) {
                    data.events.forEach((event: Events) => checkRegistration(event.id));
                }
            } catch (err: any) {
                toast.error("Failed to load Events");
            } finally {
                setLoading(false);
            }
        };

        const fetchRegistrations = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/registrations");
                if (!res.ok) throw new Error("Failed to fetch registrations");
                const data = await res.json();
                setRegistrations(data.registrations);
            } catch (err: any) {
                toast.error("Failed to load registrations");
            } finally {
                setLoading(false);
            }
        };

        const fetchPayments = async () => {
            try {
                const res = await fetch("/api/payments");
                if (!res.ok) throw new Error("Failed to fetch payments");
                const data = await res.json();
                setPayments(data.payments || []);
            } catch {
                toast.error("Failed to load payments");
            }
        };

        fetchRegistrations();
        fetchPayments();
        fetchEvents();
    }, []);

    const paymentMap = payments.reduce((acc, payment) => {
        const key = `${payment.userId}_${payment.eventId}`;
        acc[key] = true;
        return acc;
    }, {} as Record<string, boolean>);

    const enrichedRegistrations = registrations
        // Filter based on role
        .filter(reg => currentUser?.role === 'Youth' ? reg.userId === currentUser.id : true)
        .map(reg => {
            const key = `${reg.userId}_${reg.eventId}`;
            const event = events.find(e => e.id === reg.eventId);
            const isFree = !event?.price || event.price === 0;

            let paymentStatus: "paid" | "pending" | "free";
            if (isFree) paymentStatus = "free";
            else if (paymentMap[key]) paymentStatus = "paid";
            else paymentStatus = "pending";

            return {
                ...reg,
                eventTitle: event?.title || "Unknown Event",
                paymentStatus,
            };
        });

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                    {currentUser?.role === 'Youth' ? 'My Registrations' : 'Registrations'}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {currentUser?.role === 'Youth'
                        ? "Events you've registered for"
                        : "All event registrations"}
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {currentUser?.role !== 'Youth' && <TableHead>Name</TableHead>}
                                <TableHead>Event</TableHead>
                                <TableHead>Date</TableHead>
                                {currentUser?.role !== 'Youth' && <TableHead>Status</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrichedRegistrations.map(reg => (
                                <TableRow key={reg.id} className="animate-fade-in">
                                    {currentUser?.role !== 'Youth' && <TableCell className="font-medium">{reg.name}</TableCell>}
                                    <TableCell>{reg.eventTitle}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(reg.registeredAt).toISOString().split('T')[0]}
                                    </TableCell>
                                    {currentUser?.role !== 'Youth' && (
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    reg.paymentStatus === 'paid'
                                                        ? 'default'
                                                        : reg.paymentStatus === 'pending'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                }
                                            >
                                                {reg.paymentStatus}
                                            </Badge>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}