"use client"

import { Calendar, Users, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/lib/context/AppContext';
import { mockPayments, mockRegistrations } from '@/lib/data/mock';
import { StatCard } from '../StatCard';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '../EventCard';
import { useEffect, useState } from 'react';
import { Events, Payment, Registration, User, UserRole } from '@/lib/types';
import { toast } from "sonner";
import { auth } from '@/lib/firebase/firebase';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


export function DashboardOverview() {
    const { currentUser, isAuthLoading } = useApp();
    const [events, setEvents] = useState<Events[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [registeredEvents, setRegisteredEvents] = useState<Record<string, boolean>>({});
    const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date());
    const [registrations, setRegistrations] = useState<any[]>([])
    const [totalRegistrations, setTotalRegistrations] = useState(0)
    const totalRevenue = mockPayments.reduce((sum, p) => sum + p.amount, 0);
    const [latestRegistrations, setLatestRegistrations] = useState<Registration[]>([]);
    const [payments, setPayments] = useState<Payment[]>([])

    const role: UserRole = currentUser?.role ?? "Youth";

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)

            try {
                const res = await fetch("/api/events", {
                    method: "GET",
                })

                if (!res.ok) {
                    throw new Error("Failed to fetch events")
                }

                const data = await res.json()

                setEvents(data.events)

                // 🔥 Check registration for each event
                if (auth.currentUser) {
                    data.events.forEach((event: Events) => {
                        checkRegistration(event.id);
                    });
                }

            } catch (err: any) {
                setError(err.message)
                toast.error("Failed to load Events")
            } finally {
                setLoading(false)
            }
        }

        const fetchUsers = async () => {
            setLoading(true)
            try {
                const res = await fetch("/api/users", {
                    method: "GET",
                })

                if (!res.ok) {
                    throw new Error("Failed to fetch users")
                }

                const data = await res.json()

                setUsers(data.users)
            } catch (err: any) {
                setError(err.message)
                toast.error("Failed to load users")
            } finally {
                setLoading(false)
            }
        }

        const fetchRegistrations = async () => {
            setLoading(true)

            try {
                const res = await fetch("/api/registrations", {
                    method: "GET",
                })

                if (!res.ok) {
                    throw new Error("Failed to fetch registrations")
                }

                const data = await res.json()

                // Sort by latest (createdAt DESC) and limit to 5
                const latestFive = data.registrations
                    .sort(
                        (a: Registration, b: Registration) =>
                            new Date(b.registeredAt).getTime() -
                            new Date(a.registeredAt).getTime()
                    )
                    .slice(0, 5);

                setLatestRegistrations(latestFive);

                setRegistrations(data.registrations)
                setTotalRegistrations(data.count)

            } catch (err: any) {
                setError(err.message)
                toast.error("Failed to load registrations")
            } finally {
                setLoading(false)
            }
        }

        const fetchPayments = async () => {
            try {
                const res = await fetch("/api/payments")

                if (!res.ok) {
                    throw new Error("Failed to fetch payments")
                }

                const data = await res.json()
                setPayments(data.payments || [])
            } catch (err) {
                toast.error("Failed to load payments")
            }
        }

        fetchUsers()
        fetchEvents()
        fetchRegistrations()
        fetchPayments()
    }, [])

    const paymentMap = payments.reduce((acc, payment) => {
        const key = `${payment.userId}_${payment.eventId}`
        acc[key] = true
        return acc
    }, {} as Record<string, boolean>)

    const enrichedRegistrations = registrations.map((reg) => {
        const key = `${reg.userId}_${reg.eventId}`
        const event = events.find(e => e.id === reg.eventId)

        const isFree = !event?.price || event.price === 0

        let paymentStatus: "paid" | "pending" | "free"

        if (isFree) {
            paymentStatus = "free"
        } else if (paymentMap[key]) {
            paymentStatus = "paid"
        } else {
            paymentStatus = "pending"
        }

        return {
            ...reg,
            eventTitle: event?.title || "Unknown Event",
            paymentStatus,
        }
    })

    // Register
    const handleRegisterEvent = async () => {
        if (!selectedEvent || !auth.currentUser) return;

        try {
            setRegisterLoading(true);

            // Get Firebase ID token for authorization
            const idToken = await auth.currentUser.getIdToken();

            const res = await fetch(`/api/events/${selectedEvent.id}/register`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to register");
            }

            // ✅ Update UI immediately
            setRegisteredEvents(prev => ({
                ...prev,
                [selectedEvent.id]: true,
            }));

            // ✅ Increment total registrations
            setTotalRegistrations(prev => prev + 1);

            setRegisterOpen(false);
            setRegisterSuccess(true);

            toast.success("Successfully registered for the event");
        } catch (err) {
            toast.error("Registration failed");
        } finally {
            setRegisterLoading(false);
        }
    };

    // Check Is Regsiter
    const checkRegistration = async (eventId: string) => {
        if (!auth.currentUser) return;

        try {
            const token = await auth.currentUser.getIdToken();

            const res = await fetch(`/api/events/${eventId}/check-registration`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
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

    // Show loading only while auth is initializing
    if (isAuthLoading) return <div>Loading...</div>;

    // If user is still null (not logged in), show message
    if (!currentUser) return <div>Please log in</div>;

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                    Welcome back, {currentUser?.name.split(' ')[0]}!
                </h1>
                <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Events */}
                <StatCard
                    title="Total Events"
                    value={events.length}
                    icon={Calendar}
                    variant="primary"
                    change={`Upcoming: ${upcomingEvents.length}`}
                />

                {/* Total Registrations */}
                <StatCard
                    title="Registrations"
                    value={totalRegistrations}
                    icon={Users}
                    variant="accent"
                    change={
                        currentUser.role === "Admin" || currentUser.role === "Leader"
                            ? `Paid: ${enrichedRegistrations.filter(r => r.paymentStatus === 'paid').length} | Free: ${enrichedRegistrations.filter(r => r.paymentStatus === 'free').length}`
                            : undefined // Non-leader/non-admin see no breakdown
                    }
                />

                {currentUser.role === "Admin" || currentUser.role === "Leader" && (
                    <>
                        {/* Total Revenue */}
                        <StatCard
                            title="Revenue"
                            value={`KSh ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`}
                            icon={CreditCard}
                            variant="secondary"
                            change={`Pending: ${enrichedRegistrations.filter(r => r.paymentStatus === 'pending').length}`}
                        />

                        {/* Total Users */}
                        <StatCard
                            title="Users"
                            value={users.length}
                            icon={TrendingUp}
                            variant="default"
                            change={`Youth: ${users.filter(u => u.role === 'Youth').length} | Leaders: ${users.filter(u => u.role === 'Leader').length}`}
                        />
                    </>
                )}

                {currentUser.role !== "Admin" && currentUser.role !== "Leader" && (
                    <>
                        {/* Upcoming Events */}
                        <StatCard
                            title="Upcoming Events"
                            value={upcomingEvents.length}
                            icon={TrendingUp}
                            variant="secondary"
                        // No Paid/Free breakdown for Youth
                        />

                        {/* My Registrations */}
                        <StatCard
                            title="My Registrations"
                            value={enrichedRegistrations.filter(r => r.userId === currentUser.id).length}
                            icon={Users}
                            variant="accent"
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-display font-semibold text-foreground text-lg">Upcoming Events</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingEvents.slice(0, 4).map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                userRole={role}
                                isRegistered={registeredEvents[event.id]}
                                onRegister={() => {
                                    setSelectedEvent(event);
                                    setRegisterOpen(true);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {(currentUser.role === "Admin" || currentUser.role === "Leader") && (
                    <div className="space-y-4">
                        <h2 className="font-display font-semibold text-foreground text-lg">Recent Registrations</h2>
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <p className="p-4 text-sm text-muted-foreground">Loading...</p>
                                ) : registrations.length === 0 ? (
                                    <p className="p-4 text-sm text-muted-foreground">
                                        No registrations found
                                    </p>
                                ) : (
                                    enrichedRegistrations
                                        .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
                                        .slice(0, 5)
                                        .map((reg, i) => (
                                            <div
                                                key={reg.id}
                                                className={`flex items-center justify-between p-4 ${i !== 0 ? 'border-t' : ''}`}
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{reg.name}</p>
                                                    <p className="text-xs text-muted-foreground">{reg.eventTitle}</p>
                                                </div>

                                                <Badge
                                                    variant={
                                                        reg.paymentStatus === 'paid'
                                                            ? 'default'
                                                            : reg.paymentStatus === 'pending'
                                                                ? 'secondary'
                                                                : reg.paymentStatus === 'free'
                                                                    ? 'outline'
                                                                    : 'destructive'
                                                    }
                                                    className="text-xs"
                                                >
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

            {/* Register Confirmation Dialog */}
            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogContent className="w-md">
                    <DialogHeader>
                        <DialogTitle>Register for Event</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to register for
                        <span className="font-semibold"> {selectedEvent?.title}</span>?
                    </p>

                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            onClick={handleRegisterEvent}
                            disabled={registerLoading}
                            className="flex items-center gap-2"
                        >
                            {registerLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {registerLoading ? "Registering..." : "Confirm Registration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Registration Success */}
            <Dialog open={registerSuccess} onOpenChange={setRegisterSuccess}>
                <DialogContent className="w-md text-center">
                    <DialogHeader>
                        <DialogTitle>Registration Successful 🎉</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        You have successfully registered for the event.
                    </p>

                    <DialogFooter className="mt-4">
                        <Button onClick={() => setRegisterSuccess(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
