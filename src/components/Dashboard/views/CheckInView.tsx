"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Events, Registration } from "@/lib/types";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AlertCircle, Camera, CheckCircle2, Loader2, QrCode, Search, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useEvents } from "@/hooks/useEvents";

type CheckedInGuest = { registrationId: string; time: string };

const CheckInView = () => {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [scanMode, setScanMode] = useState(false);
    const [checkedIn, setCheckedIn] = useState<CheckedInGuest[]>([]);
    const [eventRegistrations, setEventRegistrations] = useState<Registration[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);
    const [loadingRegistrations, setLoadingRegistrations] = useState(false);
    const [loadingCheckins, setLoadingCheckins] = useState(false);
    const [checkingInIds, setCheckingInIds] = useState<Set<string>>(new Set());

    const { data: eventsData, isLoading: loadingEvents } = useEvents();
    const allEvents = eventsData?.events ?? [];
    const selectedEvent = allEvents.find(e => e.id === selectedEventId);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        if (isMobile) setScanMode(true);
        else setScanMode(false);
    }, [isMobile]);

    useEffect(() => {
        if (!selectedEventId || !selectedEvent) return;

        const load = async () => {
            setLoadingRegistrations(true);
            try {
                if (selectedEvent.price && selectedEvent.price > 0) {
                    const data = await api.get<{ payments: Array<{ id: string; userId: string; userName: string; eventId: string; eventTitle: string; paymentDate: string }> }>(`/api/payments?eventId=${selectedEventId}`);
                    const paidUsers: Registration[] = data.payments.map(p => ({
                        id: p.id, orgId: "", userId: p.userId,
                        name: p.userName || "Guest",
                        eventId: p.eventId,
                        eventTitle: p.eventTitle || selectedEvent.title,
                        registeredAt: p.paymentDate,
                        paymentStatus: "paid",
                    }));
                    setEventRegistrations(paidUsers);
                } else {
                    const data = await api.get<{ registrations: Registration[] }>(`/api/registrations?eventId=${selectedEventId}`);
                    setEventRegistrations(data.registrations ?? []);
                }
            } catch (err) {
                console.error("Failed to fetch registrations", err);
                toast.error("Failed to load registrations");
            } finally {
                setLoadingRegistrations(false);
            }
        };

        load();
    }, [selectedEventId, selectedEvent]);

    useEffect(() => {
        if (!selectedEventId) return;

        const loadCheckins = async () => {
            setLoadingCheckins(true);
            try {
                const data = await api.get<{ checkins: Array<{ registrationId: string; checkedInAt: { _seconds: number } | string }> }>(`/api/checkins?eventId=${selectedEventId}`);
                setCheckedIn((data.checkins || []).map(c => ({
                    registrationId: c.registrationId,
                    time: typeof c.checkedInAt === "object" && "_seconds" in c.checkedInAt
                        ? new Date(c.checkedInAt._seconds * 1000).toLocaleString()
                        : new Date(c.checkedInAt as string).toLocaleString(),
                })));
            } catch {
                setCheckedIn([]);
            } finally {
                setLoadingCheckins(false);
            }
        };

        loadCheckins();
    }, [selectedEventId]);

    const filteredRegistrations = searchQuery
        ? eventRegistrations.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : eventRegistrations;

    const isCheckedIn = (regId: string) => checkedIn.some(c => c.registrationId === regId);

    const handleCheckIn = async (regId: string, guestName: string) => {
        if (isCheckedIn(regId)) { toast.info(`${guestName} is already checked in`); return; }
        setCheckingInIds(prev => new Set(prev).add(regId));
        try {
            await api.post("/api/checkins", { registrationId: regId, eventId: selectedEventId });
            setCheckedIn(prev => [...prev, { registrationId: regId, time: new Date().toLocaleTimeString() }]);
            toast.success(`${guestName} checked in successfully!`);
        } catch {
            toast.error("Check-in failed");
        } finally {
            setCheckingInIds(prev => { const s = new Set(prev); s.delete(regId); return s; });
        }
    };

    const handleQrScan = async (raw?: string) => {
        if (isProcessingScan) return;
        const trimmed = raw?.trim();
        if (!trimmed) return;
        setIsProcessingScan(true);
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.eventId !== selectedEventId) { toast.error("Wrong event"); return; }
            const reg = eventRegistrations.find(r => r.id === parsed.registrationId);
            if (reg) {
                await handleCheckIn(reg.id, reg.name);
                setScanSuccess(true);
                if (navigator.vibrate) navigator.vibrate(200);
                setScanMode(false);
                setTimeout(() => { setScanSuccess(false); setScanMode(true); }, 2000);
            } else {
                toast.error("Invalid ticket");
            }
        } catch {
            toast.error("Invalid QR code");
        } finally {
            setIsProcessingScan(false);
        }
    };

    const checkedInCount = eventRegistrations.filter(r => isCheckedIn(r.id)).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Event Check-In</h1>
                <p className="text-muted-foreground mt-1">Scan QR codes or search by name to check in guests</p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Select Event</CardTitle>
                    <CardDescription>Choose an event to start checking in guests</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingEvents ? (
                        <Skeleton className="h-10 w-64" />
                    ) : (
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-full sm:w-80">
                                <SelectValue placeholder="Choose an event..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allEvents.map(event => (
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
                    {loadingRegistrations || loadingCheckins ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card><CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <UserCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{checkedInCount}</p>
                                        <p className="text-xs text-muted-foreground">Checked In</p>
                                    </div>
                                </div>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                                        <AlertCircle className="h-5 w-5 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{eventRegistrations.length - checkedInCount}</p>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                    </div>
                                </div>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                                        <QrCode className="h-5 w-5 text-accent" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{eventRegistrations.length}</p>
                                        <p className="text-xs text-muted-foreground">Total Registered</p>
                                    </div>
                                </div>
                            </CardContent></Card>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {isMobile && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Camera className="h-4 w-4" /> QR Code Scanner
                                    </CardTitle>
                                    <CardDescription>Scan QR code with your camera</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button variant={scanMode ? "destructive" : "default"} size="sm" onClick={() => setScanMode(v => !v)}>
                                        {scanMode ? <><X className="h-4 w-4 mr-2" />Stop Scanner</> : <><Camera className="h-4 w-4 mr-2" />Start Scanner</>}
                                    </Button>
                                    {scanMode ? (
                                        <div className="relative w-[min(30vw,18rem)] h-[min(30vh,18rem)] min-w-60 overflow-hidden rounded-xl border bg-black/5">
                                            <Scanner
                                                onScan={codes => { const raw = codes?.[0]?.rawValue; if (raw) handleQrScan(raw); }}
                                                onError={() => toast.error("Camera access failed")}
                                                constraints={{ facingMode: "environment" }}
                                                scanDelay={1200}
                                                styles={{ container: { width: "100%", height: "100%" }, video: { width: "100%", height: "100%", objectFit: "cover" } }}
                                            />
                                            {scanSuccess && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
                                                    <CheckCircle2 className="h-10 w-10 text-white animate-bounce" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">Scanner paused</div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Search className="h-4 w-4" /> Manual Search
                                </CardTitle>
                                <CardDescription>Search by guest name to check in manually</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input placeholder="Type guest name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                {searchQuery && filteredRegistrations.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No guests found for &ldquo;{searchQuery}&rdquo;</p>
                                )}
                                {searchQuery && filteredRegistrations.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {filteredRegistrations.map(reg => (
                                            <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                                <div>
                                                    <p className="font-medium text-sm">{reg.name}</p>
                                                    <p className="text-xs text-muted-foreground">#{reg.id.slice(0, 8)} · {reg.paymentStatus}</p>
                                                </div>
                                                {isCheckedIn(reg.id) ? (
                                                    <Badge className="bg-accent/10 text-accent border-accent/30">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Checked In
                                                    </Badge>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleCheckIn(reg.id, reg.name)} disabled={checkingInIds.has(reg.id)}>
                                                        {checkingInIds.has(reg.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check In"}
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
                            <CardDescription>{checkedInCount} of {eventRegistrations.length} guests checked in</CardDescription>
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
                                    {loadingRegistrations ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                                        ))
                                    ) : eventRegistrations.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No registrations for this event</TableCell></TableRow>
                                    ) : (
                                        eventRegistrations.map(reg => {
                                            const checked = isCheckedIn(reg.id);
                                            const record = checkedIn.find(c => c.registrationId === reg.id);
                                            return (
                                                <TableRow key={reg.id}>
                                                    <TableCell className="font-medium">{reg.name}</TableCell>
                                                    <TableCell className="text-muted-foreground font-mono text-xs">#{reg.id.slice(0, 8)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={reg.paymentStatus === 'paid' ? 'default' : reg.paymentStatus === 'pending' ? 'secondary' : 'outline'}>
                                                            {reg.paymentStatus}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {checked ? (
                                                            <Badge className="bg-green-100 text-green-700 border-green-200">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                {record?.time ?? "Checked In"}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground">Not checked in</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {!checked && (
                                                            <Button size="sm" onClick={() => handleCheckIn(reg.id, reg.name)} disabled={checkingInIds.has(reg.id)}>
                                                                {checkingInIds.has(reg.id) ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking in...</> : "Check In"}
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default CheckInView;
