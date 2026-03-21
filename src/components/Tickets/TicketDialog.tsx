'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import QRCode from 'react-qr-code';
import { TicketData } from '@/lib/types';

interface TicketDialogProps {
  data: TicketData;
  open: boolean;
  onClose: () => void;
}

export function TicketDialog({ data, open, onClose }: TicketDialogProps) {
  const qrPayload = JSON.stringify({
    registrationId: data.registrationId,
    eventTitle: data.eventTitle,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-2/3">
        <DialogHeader>
          <DialogTitle className="text-center">Event Ticket</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 items-center justify-center bg-muted p-4 rounded-xl border shadow">
          {/* Ticket Details */}
          <div className="w-full bg-background rounded-xl p-4 shadow-inner border">
            <div className="space-y-2 text-sm mb-4">
              <p><strong>Event:</strong> {data.eventTitle}</p>
              <p><strong>Date:</strong> {data.date}</p>
              <p><strong>Time:</strong> {data.time}</p>
              <p><strong>Location:</strong> {data.location}</p>
              <p><strong>Name:</strong> {data.name}</p>
              <p><strong>Email:</strong> {data.email}</p>
              <p className="text-xs text-muted-foreground">Ticket ID: {data.registrationId}</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <QRCode value={qrPayload} size={160} />
              <p className="text-xs text-muted-foreground text-center">
                Present this QR code at event check-in
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex justify-center gap-2">
          <Button onClick={() => window.print()}>Print Ticket</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}