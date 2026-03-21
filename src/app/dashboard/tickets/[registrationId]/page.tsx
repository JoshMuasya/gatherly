'use client';
import { useEffect, useState } from 'react';
import Ticket from '@/components/Tickets/Tickets';
import { TicketData } from '@/lib/types';

export default function TicketPrintPage() {
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('ticketData');
    if (data) setTicketData(JSON.parse(data));
  }, []);

  if (!ticketData) return <p>Loading ticket...</p>;

  return <Ticket data={ticketData} />;
}