"use client"

import { Search, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { EventCard } from '../EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Events, TicketData } from '@/lib/types';
import { TicketDialog } from '@/components/Tickets/TicketDialog';
import { PaymentDialog } from '@/components/Dashboard/PaymentDialog';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useRegisterForEvent } from '@/hooks/useEvents';
import { usePayments } from '@/hooks/usePayments';
import { useRegistrations } from '@/hooks/useRegistrations';

export function EventsView() {
    const { currentUser } = useApp();
    const [search, setSearch] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Events | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [isEventLoading, setIsEventLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [newEvent, setNewEvent] = useState({
        title: '', desc: '', location: '', maxAttendees: 0, date: '', isFree: false, price: 0,
    });
    const [isOpen, setIsOpen] = useState(false);

    const isAdminLeader = currentUser?.role === "Admin" || currentUser?.role === "Leader" || currentUser?.role === "SuperAdmin";

    const { data: eventsData, isLoading: loadingEvents } = useEvents();
    const { data: paymentsData } = usePayments();
    const { data: regsData } = useRegistrations();

    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();
    const deleteEvent = useDeleteEvent();
    const registerForEvent = useRegisterForEvent();

    const allEvents = eventsData?.events ?? [];
    const allPayments = paymentsData?.payments ?? [];
    const allRegistrations = regsData?.registrations ?? [];

    const paidEventIds = useMemo(() => allPayments.map(p => p.eventId), [allPayments]);

    const getUserRegistration = (eventId: string) =>
        allRegistrations.find(r => r.eventId === eventId && r.userId === currentUser?.id);

    const filteredEvents = useMemo(() => {
        if (!search) return allEvents;
        return allEvents.filter(ev => ev.title.toLowerCase().includes(search.toLowerCase()));
    }, [search, allEvents]);

    const handleAddEvent = async () => {
        if (!isAdminLeader) return;
        setIsOpen(false);
        setIsEventLoading(true);
        try {
            await createEvent.mutateAsync({
                title: newEvent.title,
                desc: newEvent.desc,
                location: newEvent.location,
                maxAttendees: newEvent.maxAttendees,
                date: newEvent.date,
                time: newEvent.date.split("T")[1] ?? "",
                isFree: newEvent.isFree,
                price: newEvent.price,
            } as Parameters<typeof createEvent.mutateAsync>[0]);
            setNewEvent({ title: '', desc: '', location: '', maxAttendees: 0, date: '', isFree: false, price: 0 });
            toast.success('Event created successfully');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create event');
        } finally {
            setIsEventLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        try {
            await deleteEvent.mutateAsync(eventId);
            toast.success('Event deleted');
        } catch {
            toast.error('Failed to delete event');
        }
    };

    const handleUpdateEvent = async () => {
        if (!editingEvent) return;
        setEditOpen(false);
        setIsEventLoading(true);
        try {
            await updateEvent.mutateAsync(editingEvent);
            setEditingEvent(null);
            toast.success('Event updated');
        } catch {
            toast.error('Failed to update event');
        } finally {
            setIsEventLoading(false);
        }
    };

    const handleRegisterEvent = async () => {
        if (!selectedEvent) return;
        try {
            await registerForEvent.mutateAsync(selectedEvent.id);
            setRegisterOpen(false);
            setRegisterSuccess(true);
            toast.success('Successfully registered for the event');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Registration failed');
        }
    };

    if (!currentUser) return (
        <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col justify-center align-middle gap-4">
                <div className="flex flex-col justify-center items-center">
                    <h1 className="text-2xl font-display font-bold text-foreground">
                        {currentUser?.role === 'Leader' ? 'My Events' : 'Events'}
                    </h1>
                    <p className="text-muted-foreground mt-1">Browse and manage events</p>
                </div>
                <div className="flex flex-row justify-between gap-2 items-center w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search events..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    {isAdminLeader && (
                        <Button size="sm" onClick={() => setIsOpen(true)} disabled={isEventLoading} className="bg-primary hover:bg-primary/90">
                            {isEventLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" /> New Event
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingEvents ? (
                    [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)
                ) : (
                    filteredEvents.map((event) => {
                        const hasPaid = paidEventIds.includes(event.id);
                        const registration = getUserRegistration(event.id);

                        return (
                            <EventCard
                                key={event.id}
                                event={event}
                                userRole={currentUser?.role}
                                isRegistered={!!registration}
                                isDeleting={deleteEvent.isPending && deleteEvent.variables === event.id}
                                showAdminActions={isAdminLeader}
                                onDelete={() => handleDeleteEvent(event.id)}
                                onEdit={() => { setEditingEvent(event); setEditOpen(true); }}
                                onRegister={() => { setSelectedEvent(event); setRegisterOpen(true); }}
                                onPay={!hasPaid && event.price > 0 ? () => { setSelectedEvent(event); setPayDialogOpen(true); } : undefined}
                                canPrintTicket={event.price === 0 || hasPaid}
                                onPrintTicket={() => {
                                    if (!registration) { toast.error("You are not registered for this event"); return; }
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
                        );
                    })
                )}
            </div>

            {!loadingEvents && filteredEvents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">No events found</p>
                    <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
            )}

            {/* Create Event Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Create New Event</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Title</Label>
                            <Input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Description</Label>
                            <Textarea value={newEvent.desc} onChange={e => setNewEvent({ ...newEvent, desc: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Location</Label>
                            <Input value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Max Attendees</Label>
                            <Input type="number" value={newEvent.maxAttendees} onChange={e => setNewEvent({ ...newEvent, maxAttendees: Number(e.target.value) })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Date &amp; Time</Label>
                            <Input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={newEvent.isFree} onChange={e => setNewEvent({ ...newEvent, isFree: e.target.checked })} id="freeEvent" className="h-4 w-4" />
                            <label htmlFor="freeEvent" className="text-sm text-foreground">Free Event?</label>
                        </div>
                        {!newEvent.isFree && (
                            <div className="flex flex-col gap-1.5">
                                <Label>Price (KSH)</Label>
                                <Input type="number" min={0} value={newEvent.price || ''} onChange={e => setNewEvent({ ...newEvent, price: Number(e.target.value) })} />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddEvent} disabled={createEvent.isPending}>
                            {createEvent.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {createEvent.isPending ? 'Creating...' : 'Add Event'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
                    {editingEvent && (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <Label>Title</Label>
                                <Input value={editingEvent.title} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Description</Label>
                                <Textarea value={editingEvent.desc} onChange={e => setEditingEvent({ ...editingEvent, desc: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Location</Label>
                                <Input value={editingEvent.location} onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Max Attendees</Label>
                                <Input type="number" value={editingEvent.maxAttendees} onChange={e => setEditingEvent({ ...editingEvent, maxAttendees: Number(e.target.value) })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateEvent} disabled={updateEvent.isPending}>
                            {updateEvent.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Update Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Register Dialog */}
            <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogContent className="w-md">
                    <DialogHeader><DialogTitle>Register for Event</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">
                        Are you sure you want to register for <span className="font-semibold">{selectedEvent?.title}</span>?
                    </p>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
                        <Button onClick={handleRegisterEvent} disabled={registerForEvent.isPending} className="flex items-center gap-2">
                            {registerForEvent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {registerForEvent.isPending ? 'Registering...' : 'Confirm Registration'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success */}
            <Dialog open={registerSuccess} onOpenChange={setRegisterSuccess}>
                <DialogContent className="w-md text-center">
                    <DialogHeader><DialogTitle>Registration Successful!</DialogTitle></DialogHeader>
                    <p className="text-muted-foreground">You have successfully registered for the event.</p>
                    <DialogFooter className="mt-4"><Button onClick={() => setRegisterSuccess(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {ticketData && (
                <TicketDialog data={ticketData} open={!!ticketData} onClose={() => setTicketData(null)} />
            )}
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
