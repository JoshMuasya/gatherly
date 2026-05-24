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
    eventId: data.eventId,
  });

  const eventDate = new Date(data.date);

  const formattedDate = eventDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = eventDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-md p-4 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">Event Ticket</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-col gap-3 items-center bg-muted p-3 rounded-xl border shadow">
            <div className="w-full bg-background rounded-xl p-3 shadow-inner border space-y-1.5 text-sm">
              <p><strong>Event:</strong> {data.eventTitle}</p>
              <p><strong>Date:</strong> {formattedDate}</p>
              <p><strong>Time:</strong> {formattedTime}</p>
              <p><strong>Location:</strong> {data.location}</p>
              <p><strong>Name:</strong> {data.name}</p>
              <p><strong>Email:</strong> {data.email}</p>
              <p className="text-xs text-muted-foreground">Ticket ID: {data.registrationId}</p>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-full max-w-[160px] aspect-square">
                <QRCode value={qrPayload} style={{ width: '100%', height: '100%' }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Present this QR code at event check-in
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-3 flex flex-col gap-2">
          <Button className="w-full" onClick={() => window.print()}>Print Ticket</Button>
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}