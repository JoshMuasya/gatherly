'use client';

import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { TicketData } from '@/lib/types';

export default function Ticket({ data }: { data: TicketData }) {

    console.log("Ticket", data)
    const qrPayload = JSON.stringify({
        registrationId: data.registrationId,
        eventTitle: data.eventTitle,
    });

    return (
        <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-muted p-6 w-full">
            <div id="ticket" className="w-3/4 bg-background rounded-xl shadow-xl p-6 border">
                <h1 className="text-xl font-bold text-center mb-4">Event Ticket</h1>

                <div className="space-y-2 text-sm mb-6">
                    <p><strong>Event:</strong> {data.eventTitle}</p>
                    <p><strong>Date:</strong> {data.date}</p>
                    <p><strong>Time:</strong> {data.time}</p>
                    <p><strong>Location:</strong> {data.location}</p>
                    <p><strong>Name:</strong> {data.name}</p>
                    <p><strong>Email:</strong> {data.email}</p>
                    <p className="text-xs text-muted-foreground">Ticket ID: {data.registrationId}</p>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <QRCode value={qrPayload} size={160} />
                    <p className="text-xs text-muted-foreground text-center">
                        Present this QR code at event check-in
                    </p>
                </div>
            </div>

            <div className="">
                <Button onClick={() => window.print()}>Print Ticket</Button>
            </div>
        </div>
    );
}