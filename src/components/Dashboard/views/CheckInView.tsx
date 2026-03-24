"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Events, Registration } from "@/lib/types";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertCircle, Camera, CheckCircle2, QrCode, Search, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CheckedInGuest = {
    registrationId: string;
    time: string;
};

const CheckInView = () => {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [scanMode, setScanMode] = useState(false);
    const [checkedIn, setCheckedIn] = useState<CheckedInGuest[]>([]);
    const [events, setEvents] = useState<Events[]>([]);
    const [eventRegistrations, setEventRegistrations] = useState<Registration[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);

    const [loadingEvents, setLoadingEvents] = useState(false);
    const [loadingRegistrations, setLoadingRegistrations] = useState(false);
    const [loadingCheckins, setLoadingCheckins] = useState(false);

    // Detect screen size
    useEffect(() => {
        const checkScreen = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    // Auto toggle scanner
    useEffect(() => {
        if (isMobile) setScanMode(true);
        else setScanMode(false);
    }, [isMobile]);

    useEffect(() => {
        setLoadingEvents(true);
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/events");
                const data = await res.json();
                setEvents(data.events);
            } catch (err) {
                console.error("Failed to fetch events", err);
            } finally {
                setLoadingEvents(false);
            }
        };

        fetchEvents();
    }, []);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    useEffect(() => {
        if (!selectedEventId) return;

        const fetchRegistrations = async () => {
            setLoadingRegistrations(true);
            try {
                if (!selectedEvent) return;

                if (selectedEvent.price && selectedEvent.price > 0) {
                    const res = await fetch(`/api/payments?eventId=${selectedEventId}`);
                    const data = await res.json();

                    const paidUsers: Registration[] = data.payments
                        .filter((p: any) => p.eventId === selectedEventId)
                        .map((p: any) => ({
                            id: p.id,
                            userId: p.userId,
                            name: p.userName || "Guest",
                            userName: p.userName || "Guest",
                            eventId: p.eventId,
                            eventTitle: p.eventTitle || selectedEvent.title,
                            registeredAt: p.paymentDate,
                            paymentStatus: "paid",
                        }));

                    setEventRegistrations(paidUsers);
                } else {
                    const res = await fetch(`/api/registrations?eventId=${selectedEventId}`);
                    const data = await res.json();

                    const filteredRegs = (data.registrations || []).filter(
                        (r: any) => r.eventId === selectedEventId
                    );

                    const users: Registration[] = filteredRegs.map((r: any) => ({
                        id: r.id,
                        userId: r.userId || "unknown",
                        name: r.name || r.userName || "Guest",
                        userName: r.userName || "Guest",
                        eventId: r.eventId,
                        eventTitle: r.eventTitle || selectedEvent.title,
                        registeredAt: r.registeredAt || new Date().toISOString(),
                        paymentStatus: "free",
                    }));

                    setEventRegistrations(users);
                }
            } catch (err) {
                console.error("Failed to fetch registrations", err);
            } finally {
                setLoadingRegistrations(false);
            }
        };

        fetchRegistrations();
    }, [selectedEventId, selectedEvent]);

    useEffect(() => {
        if (!selectedEventId) return;

        const fetchCheckins = async () => {
            setLoadingCheckins(true);
            try {
                const res = await fetch(`/api/checkins?eventId=${selectedEventId}`);

                if (!res.ok) {
                    console.error("Failed to fetch checkins", res.status);
                    setCheckedIn([]);
                    return;
                }

                const data = await res.json();

                // data.checkins is the array returned by your API
                setCheckedIn(
                    (data.checkins || []).map((c: any) => ({
                        registrationId: c.registrationId,
                        time: new Date(c.checkedInAt).toLocaleTimeString(),
                    }))
                );
            } catch (err) {
                console.error("Error fetching check-ins:", err);
                setCheckedIn([]);
            } finally {
                setLoadingCheckins(false);
            }
        };

        fetchCheckins();
    }, [selectedEventId]);

    const filteredRegistrations = searchQuery
        ? eventRegistrations.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : eventRegistrations;

    const isCheckedIn = (regId: string) =>
        checkedIn.some(c => c.registrationId === regId);

    const handleCheckIn = async (regId: string, guestName: string) => {
        if (isCheckedIn(regId)) {
            toast.info(`${guestName} is already checked in`);
            return;
        }

        try {
            await fetch("/api/checkins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    registrationId: regId,
                    eventId: selectedEventId,
                }),
            });

            setCheckedIn(prev => [
                ...prev,
                {
                    registrationId: regId,
                    time: new Date().toLocaleTimeString(),
                },
            ]);

            toast.success(`${guestName} checked in successfully!`);
        } catch (err) {
            toast.error("Check-in failed");
        }
    };

    const handleQrScan = async (raw?: string) => {
        if (isProcessingScan) return;

        const trimmed = raw?.trim();
        if (!trimmed) return;

        setIsProcessingScan(true);

        try {
            const parsed = JSON.parse(trimmed);

            if (parsed.eventId !== selectedEventId) {
                toast.error("Wrong event");
                return;
            }

            const reg = eventRegistrations.find(r => r.id === parsed.registrationId);

            if (reg) {
                await handleCheckIn(reg.id, reg.name);

                setScanSuccess(true);
                if (navigator.vibrate) navigator.vibrate(200);

                setScanMode(false);

                setTimeout(() => {
                    setScanSuccess(false);
                    setScanMode(true);
                }, 2000);
            } else {
                toast.error("Invalid ticket");
            }
        } catch {
            toast.error("Invalid QR");
        } finally {
            setIsProcessingScan(false);
        }
    };

    const checkedInCount = eventRegistrations.filter(r => isCheckedIn(r.id)).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Event Check-In</h1>
                <p className="text-muted-foreground mt-1">
                    Scan QR codes or search by name to check in guests
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Event</CardTitle>
                    <CardDescription>Choose an event to start checking in guests</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingEvents ? (
                        <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-md"></div>
                    ) : (
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-full sm:w-80">
                                <SelectValue placeholder="Choose an event..." />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map(event => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.title} — {event.date}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedEvent && (
                <>
                    {/* Stats cards */}
                    {loadingRegistrations || loadingCheckins ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i}>
                                    <CardContent className="pt-6 flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {/* Spinner */}
                                            <div className="relative h-8 w-8">
                                                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-t-primary border-gray-200 rounded-full animate-spin"></div>
                                            </div>
                                            {/* Loading text */}
                                            <span className="text-sm text-muted-foreground">Loading...</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <UserCheck className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{checkedInCount}</p>
                                            <p className="text-xs text-muted-foreground">Checked In</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                                            <AlertCircle className="h-5 w-5 text-secondary" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">
                                                {eventRegistrations.length - checkedInCount}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Pending</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                            <QrCode className="h-5 w-5 text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{eventRegistrations.length}</p>
                                            <p className="text-xs text-muted-foreground">Total Registered</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {isMobile && (
                            <div>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Camera className="h-4 w-4" />
                                            QR Code Scanner
                                        </CardTitle>
                                        <CardDescription>
                                            Scan QR code with a small camera view
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={scanMode ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => setScanMode(v => !v)}
                                            >
                                                {scanMode ? <X className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                                                {scanMode ? "Stop Scanner" : "Start Scanner"}
                                            </Button>
                                        </div>

                                        {scanMode ? (
                                            <div className="relative w-[min(30vw,18rem)] h-[min(30vh,18rem)] min-w-60 min-h-45 overflow-hidden rounded-xl border bg-black/5">
                                                <Scanner
                                                    onScan={(detectedCodes) => {
                                                        const rawValue = detectedCodes?.[0]?.rawValue;
                                                        if (rawValue) handleQrScan(rawValue);
                                                    }}
                                                    onError={(error) => {
                                                        console.error(error);
                                                        toast.error("Camera access failed");
                                                    }}
                                                    constraints={{ facingMode: "environment" }}
                                                    scanDelay={1200}
                                                    styles={{
                                                        container: { width: "100%", height: "100%" },
                                                        video: { width: "100%", height: "100%", objectFit: "cover" },
                                                    }}
                                                />

                                                {scanSuccess && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
                                                        <CheckCircle2 className="h-10 w-10 text-white animate-bounce" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex h-45 items-center justify-center text-sm text-muted-foreground">
                                                Scanner paused
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Search className="h-4 w-4" />
                                    Manual Search
                                </CardTitle>
                                <CardDescription>
                                    Search by guest name to check in manually
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input
                                    placeholder="Type guest name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && filteredRegistrations.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No registered guests found matching "{searchQuery}"
                                    </p>
                                )}
                                {searchQuery && filteredRegistrations.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {filteredRegistrations.map(reg => (
                                            <div
                                                key={reg.id}
                                                className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{reg.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Reg #{reg.id} · {reg.paymentStatus}
                                                    </p>
                                                </div>
                                                {isCheckedIn(reg.id) ? (
                                                    <Badge className="bg-accent/10 text-accent border-accent/30">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Checked In
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCheckIn(reg.id, reg.name)}
                                                    >
                                                        Check In
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Guest List — {selectedEvent.title}</CardTitle>
                            <CardDescription>
                                {checkedInCount} of {eventRegistrations.length} guests checked in
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Registration ID</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eventRegistrations.map(reg => {
                                        const checked = isCheckedIn(reg.id);
                                        const checkInRecord = checkedIn.find(
                                            c => c.registrationId === reg.id
                                        );
                                        return (
                                            <TableRow key={reg.id}>
                                                <TableCell className="font-medium">{reg.name}</TableCell>
                                                <TableCell className="text-muted-foreground font-mono text-xs">
                                                    #{reg.id}
                                                </TableCell>
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
                                                <TableCell>
                                                    {checked ? (
                                                        <span className="text-xs text-accent flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {checkInRecord?.time}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Not checked in</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {checked ? (
                                                        <Badge variant="outline" className="text-accent border-accent/30">
                                                            Done
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCheckIn(reg.id, reg.name)}
                                                        >
                                                            <UserCheck className="h-3 w-3 mr-1" />
                                                            Check In
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {eventRegistrations.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No registrations for this event
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

export default CheckInView