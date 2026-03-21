export type UserRole = 'Youth' | 'Leader' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePhoto?: string;
  createdAt: string;
  phoneNumber: string;
}

export interface TicketData {
  registrationId: string;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  name: string;
  email: string;
}

export interface Events {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  location: string;
  isFree: boolean;
  price: number;
  maxAttendees: number;
  attendeesCount?: number;
  organizerId?: string;
  organizerName?: string;
  registrationId?: string;
  createdAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  email?: string;
  name: string;
  eventId: string;
  eventTitle: string;
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  registeredAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  method: 'cash' | 'mpesa';
  recordedBy: string;
  paymentDate: string;
  mpesaCode: string;
}
