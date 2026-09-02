"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/context/AppContext";
import { auth } from "@/lib/firebase/firebase";
import { Events } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

const CreateEventView = () => {
    const { currentUser } = useApp();
    const isAdminLeader = currentUser?.role === "Admin" || currentUser?.role === "Leader" || currentUser?.role === "SuperAdmin" || currentUser?.role === "Treasurer" || currentUser?.role === "Owner";
    const [addingEvent, setAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        desc: '',
        location: '',
        maxAttendees: 0,
        date: '',
        isFree: false,
        price: 0,
    });

    // -------------------- Add Event --------------------
    const handleSubmit = async () => {
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

            toast.success('Event created successfully');
        } catch (err) {
            toast.error('Failed to add event');
        } finally {
            setAddingEvent(false);
        }
    };

    const update = (field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            let value: string | number | boolean = e.target.value;

            if (field === "price" || field === "maxAttendees") {
                value = Number(value);
            }

            setNewEvent(prev => ({
                ...prev,
                [field]: value
            }));
        };

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Create Event</h1>
                <p className="text-muted-foreground mt-1">Fill in the details for your new event</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault(); // prevent page reload
                            handleSubmit();
                        }}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Youth Worship Night"
                                value={newEvent.title}
                                onChange={update('title')}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your event..."
                                value={newEvent.desc}
                                onChange={update('desc')}
                                required rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={newEvent.date.split("T")[0] || ""} // just the date part
                                    onChange={(e) => {
                                        const datePart = e.target.value;
                                        const timePart = newEvent.date.split("T")[1] || "00:00";
                                        setNewEvent(prev => ({
                                            ...prev,
                                            date: `${datePart}T${timePart}`
                                        }));
                                    }}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="time">Time</Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={newEvent.date.split("T")[1] || ""}
                                    onChange={(e) => {
                                        const timePart = e.target.value;
                                        const datePart = newEvent.date.split("T")[0] || new Date().toISOString().split("T")[0];
                                        setNewEvent(prev => ({
                                            ...prev,
                                            date: `${datePart}T${timePart}`
                                        }));
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                placeholder="e.g. Main Hall"
                                value={newEvent.location}
                                onChange={update('location')}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    id="isFree"
                                    type="checkbox"
                                    checked={newEvent.isFree}
                                    onChange={(e) =>
                                        setNewEvent((prev) => ({ ...prev, isFree: e.target.checked, price: e.target.checked ? 0 : prev.price }))
                                    }
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="isFree">Free Event</Label>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price (KSh)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    placeholder="0 for free"
                                    value={newEvent.price}
                                    onChange={update('price')}
                                    disabled={newEvent.isFree}
                                    className={`w-full ${newEvent.isFree ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxAttendees">Max Attendees</Label>
                                <Input
                                    id="maxAttendees"
                                    type="number"
                                    min={1}
                                    placeholder="Unlimited"
                                    value={newEvent.maxAttendees === 0 ? '' : newEvent.maxAttendees}
                                    onChange={update('maxAttendees')}
                                    disabled={newEvent.maxAttendees === 0}
                                />
                                <div className="flex items-center space-x-2 pt-1">
                                    <input
                                        id="unlimitedAttendees"
                                        type="checkbox"
                                        checked={newEvent.maxAttendees === 0}
                                        onChange={(e) =>
                                            setNewEvent((prev) => ({ ...prev, maxAttendees: e.target.checked ? 0 : 50 }))
                                        }
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="unlimitedAttendees" className="font-normal">No limit</Label>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={addingEvent}>
                            {addingEvent ? "Creating..." : "Create Event"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default CreateEventView
