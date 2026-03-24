"use client"

import { Search, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { EventCard } from '../EventCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { auth, db } from '@/lib/firebase/firebase';
import { toast } from "sonner";
import { Events, Payment, TicketData } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { TicketDialog } from '@/components/Tickets/TicketDialog';

interface EventsState {
    events: Events[];
    registeredEvents: Record<string, boolean | undefined>;
}

export function EventsView() {
    const { currentUser } = useApp();
    const [search, setSearch] = useState('');
    const [eventsState, setEventsState] = useState<EventsState>({ events: [], registeredEvents: {} });
    const [isOpen, setIsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addingEvent, setAddingEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Events | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
    const [allRegistrations, setAllRegistrations] = useState<{
        id: string;
        eventId: string;
        userId: string;
        name: string;
        email: string;
        phone?: string | null;
        registeredAt?: string | null;
    }[]>([]);

    const [newEvent, setNewEvent] = useState({
        title: '',
        desc: '',
        location: '',
        maxAttendees: 0,
        date: '',
        isFree: false,
        price: 0,
    });

    const isAdminLeader = currentUser?.role === "Admin" || currentUser?.role === "Leader";

    useEffect(() => {
        const eventsCol = collection(db, 'events');
        const unsubscribe = onSnapshot(eventsCol, snapshot => {
            const events: Events[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Events));
            setEventsState(prev => ({ ...prev, events }));

            // Check registration for current user
            if (auth.currentUser) {
                events.forEach(event => checkRegistration(event.id));
            }
        });

        return () => unsubscribe();
    }, []);

    /** Fetch payments */
    useEffect(() => {
        const fetchPayments = async () => {
            if (!currentUser?.id) return;

            setLoadingPayments(true);
            try {
                const url = isAdminLeader ? '/api/payments' : `/api/payments?userId=${currentUser.id}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch payments');
                const { payments } = await res.json();
                setAllPayments(payments);
            } catch (err) {
                console.error('Error fetching payments:', err);
            } finally {
                setLoadingPayments(false);
            }
        };

        fetchPayments();
    }, [currentUser?.id, isAdminLeader]);

    // Fetch Registrations
    useEffect(() => {
        const fetchRegistrations = async () => {
            if (!currentUser?.id) return;

            try {
                const url = currentUser.role === "Admin" || currentUser.role === "Leader"
                    ? '/api/registrations'
                    : `/api/registrations?userId=${currentUser.id}`;

                const res = await fetch(url);
                const data = await res.json();

                if (res.ok && data.registrations) {
                    setAllRegistrations(data.registrations);
                } else {
                    console.error("Failed to fetch registrations");
                }
            } catch (err) {
                console.error("Error fetching registrations:", err);
            }
        };

        fetchRegistrations();
    }, [currentUser]);

    const getUserRegistration = (eventId: string) => {
        return allRegistrations.find(
            (reg) => reg.eventId === eventId && reg.userId === currentUser?.id
        );
    };

    const filteredEvents = useMemo(() => {
        if (!search) return eventsState.events;
        return eventsState.events.filter(ev =>
            ev.title.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, eventsState.events]);

    // -------------------- Add Event --------------------
    const handleAddEvent = async () => {
        if (!isAdminLeader || !auth.currentUser) return;
        setAddingEvent(true);

        // Optimistic ID
        const tempId = uuidv4();
        const optimisticEvent: Events = {
            id: tempId,
            title: newEvent.title,
            desc: newEvent.desc,
            location: newEvent.location,
            maxAttendees: newEvent.maxAttendees,
            date: newEvent.date,
            isFree: newEvent.isFree,
            price: newEvent.price,
            time: newEvent.date.split("T")[1] || "",
            createdAt: new Date().toISOString(),
        };

        // Update UI immediately
        setEventsState(prev => ({
            ...prev,
            events: [optimisticEvent, ...prev.events]
        }));

        setIsOpen(false);
        setNewEvent({ title: '', desc: '', location: '', maxAttendees: 0, date: '', isFree: false, price: 0 });

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(newEvent)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add event');

            // Replace temp event with real event from API
            setEventsState(prev => ({
                ...prev,
                events: prev.events.map(ev => ev.id === tempId ? data.event : ev)
            }));

            toast.success('Event created successfully');
        } catch (err) {
            // Remove optimistic event if failed
            setEventsState(prev => ({
                ...prev,
                events: prev.events.filter(ev => ev.id !== tempId)
            }));
            toast.error('Failed to add event');
        } finally {
            setAddingEvent(false);
        }
    };

    // -------------------- Delete Event --------------------
    const handleDeleteEvent = async (eventId: string) => {
        if (!isAdminLeader || !auth.currentUser) return;

        setDeletingEventId(eventId);

        // Optimistic UI
        const prevEvents = eventsState.events;
        setEventsState(prev => ({
            ...prev,
            events: prev.events.filter(ev => ev.id !== eventId),
            registeredEvents: { ...prev.registeredEvents, [eventId]: undefined }
        }));

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete event');

            toast.success('Event deleted successfully');
        } catch (err) {
            // Revert on failure
            setEventsState(prev => ({ ...prev, events: prevEvents }));
            toast.error('Failed to delete event');
        } finally {
            setDeletingEventId(null);
        }
    };

    // -------------------- Update Event --------------------
    const handleUpdateEvent = async () => {
        if (!editingEvent || !auth.currentUser) return;

        // Optimistic UI
        const prevEvents = eventsState.events;
        setEventsState(prev => ({
            ...prev,
            events: prev.events.map(ev => ev.id === editingEvent.id ? editingEvent : ev)
        }));

        setEditOpen(false);
        setEditingEvent(null);

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/events/${editingEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(editingEvent)
            });
            if (!res.ok) throw new Error('Failed to update event');
            toast.success('Event updated successfully');
        } catch (err) {
            // Revert if failed
            setEventsState(prev => ({ ...prev, events: prevEvents }));
            toast.error('Failed to update event');
        }
    };

    // -------------------- Register Event --------------------
    const handleRegisterEvent = async () => {
        if (!selectedEvent || !auth.currentUser) return;

        setRegisterLoading(true);
        setRegisterOpen(false);
        setRegisterSuccess(true);

        // Optimistic UI
        setEventsState(prev => ({
            ...prev,
            registeredEvents: { ...prev.registeredEvents, [selectedEvent.id]: true }
        }));

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/events/${selectedEvent.id}/register`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            toast.success('Successfully registered for the event');
        } catch (err) {
            setEventsState(prev => ({
                ...prev,
                registeredEvents: { ...prev.registeredEvents, [selectedEvent.id]: false }
            }));
            toast.error('Registration failed');
        } finally {
            setRegisterLoading(false);
        }
    };

    // -------------------- Check Registration --------------------
    const checkRegistration = async (eventId: string) => {
        if (!auth.currentUser) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/events/${eventId}/check-registration`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setEventsState(prev => ({
                    ...prev,
                    registeredEvents: { ...prev.registeredEvents, [eventId]: data.isRegistered }
                }));
            }
        } catch (err) {
            console.error('Failed to check registration', err);
        }
    };

    const paidEventsIds = useMemo(() => {
        return allPayments.map((payment) => payment.eventId)
    }, [allPayments])

    if (!currentUser) return <div>Loading...</div>;

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col justify-center align-middle gap-4">
                <div className='flex flex-col justify-center items-center'>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                        {currentUser?.role === 'Leader' ? 'My Events' : 'Events'}
                    </h1>
                    <p className="text-muted-foreground mt-1">Browse and manage events</p>
                </div>
                <div className="flex flex-row justify-between gap-2 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-72 gap-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search events..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents?.map((event) => {
                    const hasPaid = paidEventsIds.includes(event.id);

                    return (
                        <EventCard
                            key={event.id}
                            event={event}
                            userRole={currentUser?.role}
                            isRegistered={eventsState.registeredEvents[event.id]}
                            isDeleting={deletingEventId === event.id}
                            showAdminActions={currentUser?.role === "Admin" || currentUser?.role === "Leader"}
                            onDelete={() => handleDeleteEvent(event.id)}
                            onEdit={() => {
                                setEditingEvent(event);
                                setEditOpen(true);
                            }}
                            onRegister={() => {
                                setSelectedEvent(event);
                                setRegisterOpen(true);
                            }}

                            onPay={!hasPaid && event.price > 0 ? () => setSelectedEvent(event) : undefined}

                            canPrintTicket={event.price === 0 || hasPaid}

                            onPrintTicket={() => {
                                const registration = getUserRegistration(event.id);

                                if (!registration) {
                                    toast.error("You are not registered for this event");
                                    return;
                                }

                                setTicketData({
                                    registrationId: registration.id,    
                                    eventId: event.id,
                                    eventTitle: event.title,
                                    date: event.date,
                                    time: event.time,
                                    location: event.location,
                                    name: registration.name || currentUser?.name || '',
                                    email: registration.email || currentUser?.email || '',
                                });
                            }}
                        />
                    )
                })}
            </div>

            {filteredEvents?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">No events found</p>
                    <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
            )}

            {/* New Event Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Event</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className='flex flex-col gap-1.5'>
                            <Label>Title</Label>
                            <Input
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <Label>Description</Label>
                            <Textarea
                                value={newEvent.desc}
                                onChange={e => setNewEvent({ ...newEvent, desc: e.target.value })}
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <Label>Location</Label>
                            <Input
                                value={newEvent.location}
                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <Label>Max Attendees</Label>
                            <Input
                                type="number"
                                value={newEvent.maxAttendees}
                                onChange={e => setNewEvent({ ...newEvent, maxAttendees: Number(e.target.value) })}
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <Label>Date & Time</Label>
                            <Input
                                type="datetime-local"
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newEvent.isFree || false}
                                onChange={e => setNewEvent({ ...newEvent, isFree: e.target.checked, price: Number(e.target.value) })}
                                id="freeEvent"
                                className="h-4 w-4"
                            />
                            <label htmlFor="freeEvent" className="text-sm text-foreground">Free Event?</label>
                        </div>
                        {!newEvent.isFree && (
                            <div className='flex flex-col gap-1.5'>
                                <Label>Price (KSH)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={newEvent.price || ''}
                                    onChange={e => setNewEvent({ ...newEvent, price: Number(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddEvent}
                            disabled={addingEvent}
                        >
                            {addingEvent ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Adding Event...
                                </>
                            ) : (
                                <>
                                    Add Event
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Event</DialogTitle>
                    </DialogHeader>

                    {editingEvent && (
                        <div className="space-y-4">

                            <div className="flex flex-col gap-1.5">
                                <Label>Title</Label>
                                <Input
                                    value={editingEvent.title}
                                    onChange={(e) =>
                                        setEditingEvent({ ...editingEvent, title: e.target.value })
                                    }
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Textarea
                                    value={editingEvent.desc}
                                    onChange={(e) =>
                                        setEditingEvent({ ...editingEvent, desc: e.target.value })
                                    }
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>Location</Label>
                                <Input
                                    value={editingEvent.location}
                                    onChange={(e) =>
                                        setEditingEvent({ ...editingEvent, location: e.target.value })
                                    }
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label>Max Attendees</Label>
                                <Input
                                    type="number"
                                    value={editingEvent.maxAttendees}
                                    onChange={(e) =>
                                        setEditingEvent({
                                            ...editingEvent,
                                            maxAttendees: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                        </div>
                    )}

                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>

                        <Button onClick={handleUpdateEvent}>
                            Update Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            {/* Ticket */}
            {ticketData && (
                <TicketDialog
                    data={ticketData}
                    open={!!ticketData}
                    onClose={() => setTicketData(null)}
                />
            )}
        </div>
    );
}