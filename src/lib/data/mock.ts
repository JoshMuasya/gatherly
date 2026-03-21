import { Events, Payment, Registration, User } from "../types";

export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin', profilePhoto: '', createdAt: '2024-01-15' },
  { id: '2', name: 'David Kimani', email: 'david@example.com', role: 'Leader', profilePhoto: '', createdAt: '2024-02-20' },
  { id: '3', name: 'Grace Mwangi', email: 'grace@example.com', role: 'Youth', profilePhoto: '', createdAt: '2024-03-10' },
  { id: '4', name: 'Peter Ochieng', email: 'peter@example.com', role: 'Youth', profilePhoto: '', createdAt: '2024-03-12' },
  { id: '5', name: 'Faith Wanjiku', email: 'faith@example.com', role: 'Leader', profilePhoto: '', createdAt: '2024-04-01' },
  { id: '6', name: 'James Otieno', email: 'james@example.com', role: 'Youth', profilePhoto: '', createdAt: '2024-04-15' },
];

export const mockEvents: Events[] = [
  { id: '1', title: 'Youth Worship Night', description: 'An evening of worship and fellowship', date: '2026-03-15', time: '18:00', location: 'Main Hall', price: 0, maxAttendees: 100, organizerId: '2', organizerName: 'David Kimani', createdAt: '2024-02-28' },
  { id: '2', title: 'Community Outreach', description: 'Serving the community together', date: '2026-03-22', time: '09:00', location: 'City Park', price: 500, maxAttendees: 50, organizerId: '2', organizerName: 'David Kimani', createdAt: '2024-03-01' },
  { id: '3', title: 'Leadership Summit', description: 'Annual leadership training and development', date: '2026-04-05', time: '10:00', location: 'Conference Room B', price: 1500, maxAttendees: 30, organizerId: '5', organizerName: 'Faith Wanjiku', createdAt: '2024-03-05' },
  { id: '4', title: 'Bible Study Marathon', description: 'Deep dive into scripture together', date: '2026-04-12', time: '14:00', location: 'Room 201', price: 0, maxAttendees: 40, organizerId: '5', organizerName: 'Faith Wanjiku', createdAt: '2024-03-08' },
];

export const mockRegistrations: Registration[] = [
  { id: '1', userId: '3', userName: 'Grace Mwangi', eventId: '1', eventTitle: 'Youth Worship Night', paymentStatus: 'paid', registrationDate: '2024-03-05' },
  { id: '2', userId: '4', userName: 'Peter Ochieng', eventId: '1', eventTitle: 'Youth Worship Night', paymentStatus: 'paid', registrationDate: '2024-03-06' },
  { id: '3', userId: '6', userName: 'James Otieno', eventId: '2', eventTitle: 'Community Outreach', paymentStatus: 'pending', registrationDate: '2024-03-10' },
  { id: '4', userId: '3', userName: 'Grace Mwangi', eventId: '3', eventTitle: 'Leadership Summit', paymentStatus: 'unpaid', registrationDate: '2024-03-12' },
  { id: '5', userId: '4', userName: 'Peter Ochieng', eventId: '2', eventTitle: 'Community Outreach', paymentStatus: 'paid', registrationDate: '2024-03-11' },
];

export const mockPayments: Payment[] = [
  { id: '1', userId: '3', userName: 'Grace Mwangi', eventId: '2', eventTitle: 'Community Outreach', amount: 500, paymentMethod: 'mobile_money', recordedBy: '1', paymentDate: '2024-03-10' },
  { id: '2', userId: '4', userName: 'Peter Ochieng', eventId: '2', eventTitle: 'Community Outreach', amount: 500, paymentMethod: 'cash', recordedBy: '1', paymentDate: '2024-03-11' },
  { id: '3', userId: '3', userName: 'Grace Mwangi', eventId: '3', eventTitle: 'Leadership Summit', amount: 1500, paymentMethod: 'bank_transfer', recordedBy: '2', paymentDate: '2024-03-13' },
];
