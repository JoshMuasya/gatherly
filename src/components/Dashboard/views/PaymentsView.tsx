'use client';

import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { StatCard } from '../StatCard';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PaymentDialog } from '../PaymentDialog';
import { EventCard } from '../EventCard';
import { Events, Payment, TicketData, UserRole } from '@/lib/types';
import { useApp } from '@/lib/context/AppContext';
import { toast } from 'sonner';
import { TicketDialog } from '@/components/Tickets/TicketDialog';

interface Props {
  payments: Payment[];
  userId: string;
  userRole: UserRole;
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
};

const paymentMethodVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  mpesa: 'default',
  cash: 'secondary',
};

export function PaymentsView({ payments = [], userId, userRole }: Props) {
  const { currentUser } = useApp();
  const [selectedEvent, setSelectedEvent] = useState<Events | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<Events[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [paidEventIds, setPaidEventIds] = useState<string[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrations, setRegistrations] = useState<any[]>([])
  const [totalRegistrations, setTotalRegistrations] = useState(0)
  const [eventIds, setEventIds] = useState([])
  const [events, setEvents] = useState<Events[]>([])
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const isAdminOrLeader = userRole === 'Admin' || userRole === 'Leader';

  // Fetch Registrations
  useEffect(() => {
    const fetchRegistrationsandEvents = async () => {
      setLoading(true)

      try {
        const res = await fetch("/api/registrations", {
          method: "GET",
        })

        if (!res.ok) {
          throw new Error("Failed to fetch registrations")
        }

        const data = await res.json()

        const ids = data.registrations.map((reg: any) => reg.eventId)

        setRegistrations(data.registrations)
        setTotalRegistrations(data.count)
        setEventIds(ids)

        if (ids.length > 0) {
          const eventRes = await fetch("/api/events/byIds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventIds: ids }),
          })

          if (!eventRes.ok) throw new Error("Failed to fetch events")
          const eventsData = await eventRes.json()

          // 3️⃣ Merge registrationId into each event
          const eventsWithRegistration = eventsData.events.map((event: Events) => {
            const reg = data.registrations.find((r: any) => r.eventId === event.id);
            return {
              ...event,
              registrationId: reg?.id || null,
            };
          });

          setEvents(eventsWithRegistration);

          console.log("Events", events)
        }
      } catch (error: any) {
        setError(error.message)
        toast.error("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchRegistrationsandEvents()
  }, [currentUser?.id])

  /** Cancel registration */
  const cancelRegistration = async (eventId: string) => {
    if (!currentUser?.id) return;

    await fetch('/api/registrations/cancel', {
      method: 'DELETE',
      body: JSON.stringify({ userId: currentUser.id, eventId }),
    });

    setRegisteredEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  /** Fetch payments */
  useEffect(() => {
    const fetchPayments = async () => {
      if (!currentUser?.id) return;

      setLoadingPayments(true);
      try {
        const url = isAdminOrLeader ? '/api/payments' : `/api/payments?userId=${currentUser.id}`;
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
  }, [currentUser?.id, isAdminOrLeader]);

  /** Pagination */
  const totalPages = useMemo(() => Math.ceil(allPayments.length / itemsPerPage), [allPayments]);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allPayments.slice(start, start + itemsPerPage);
  }, [currentPage, allPayments]);

  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  const paidEventsIds = useMemo(() => {
    return allPayments.map((payment) => payment.eventId)
  }, [allPayments])

  const totalRevenue = useMemo(() => {
    return allPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Payments</h1>
        <p className="text-muted-foreground">Track payments and registered events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={`Ksh ${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="Transactions"
          value={allPayments.length.toString()}
          icon={CreditCard}
          variant="accent"
        />
      </div>

      {/* Registered Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingEvents && <p className="text-center text-muted-foreground col-span-full">Loading events...</p>}
        {!loadingEvents && events.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center">
            No registered events found.
          </p>
        )}
        {events.map((event) => {
          const hasPaid = paidEventsIds.includes(event.id);

          return (
            <EventCard
              key={event.id}
              event={event}
              userRole={currentUser!.role}
              showAdminActions={false}
              isRegistered
              onCancelRegistration={() => cancelRegistration(event.id)}

              onPay={!hasPaid && event.price > 0 ? () => setSelectedEvent(event) : undefined}

              canPrintTicket={event.price === 0 || hasPaid}

              onPrintTicket={() => {
                if (event.registrationId) {
                  setTicketData({
                    registrationId: event.registrationId,
                    eventTitle: event.title,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    name: currentUser?.name || '',
                    email: currentUser?.email || '',
                  });
                }
              }}
            />
          );
        })}
      </div>

      {/* Payments Table */}
      <div className="mt-6">
        {loadingPayments ? (
          <p className="text-center text-muted-foreground">Loading payments...</p>
        ) : allPayments.length === 0 ? (
          <p className="text-center text-muted-foreground">No payments found.</p>
        ) : (
          <div className="w-full flex flex-col justify-center align-middle items-center">
            <Table className="border rounded-lg">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((payment) => {
                  // Find the event object for this payment
                  const event = events.find((e) => e.id === payment.eventId);

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.userName}</TableCell>
                      <TableCell>{event ? event.title : 'Unknown Event'}</TableCell>
                      <TableCell>Ksh {payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex justify-end items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {selectedEvent && (
        <PaymentDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={(paid?: boolean) => {
            if (paid && selectedEvent) {
              setPaidEventIds((prev) => [...prev, selectedEvent.id.toString()]);
            }
            setSelectedEvent(null);
          }}
        />
      )}

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