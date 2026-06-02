export type UserRole = 'Youth' | 'Leader' | 'Admin' | 'Treasurer' | 'Owner' | 'SuperAdmin';

export type OrgPlan = 'starter' | 'growth' | 'pro';

export interface OrgPaymentDetails {
  type: 'till' | 'paybill' | 'phone';
  number: string;
  accountName?: string;
  businessName: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: OrgPlan;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  roleLabels?: { Youth?: string; Leader?: string };
  paymentDetails?: OrgPaymentDetails;
  whatsappNotifyNumber?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  profilePhoto?: string;
  createdAt: string;
  phoneNumber: string;
}

export interface TicketData {
  registrationId: string;
  eventId: string;
  eventTitle?: string;
  date: string;
  time: string;
  location: string;
  name: string;
  email: string;
}

export interface Events {
  id: string;
  orgId?: string;
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
  orgId: string;
  userId: string;
  email?: string;
  name: string;
  eventId: string;
  eventTitle: string;
  paymentStatus: 'pending' | 'paid' | 'unpaid';
  registeredAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  orgId: string;
  orgName: string;
  role: UserRole;
  joinedAt: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  role: UserRole;
  plan?: OrgPlan;
}

export interface AuditLog {
  id: string;
  action: string;
  orgId: string;
  actorId: string;
  actorName?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
}

export interface Payment {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  method: 'cash' | 'mpesa';
  recordedBy: string;
  paymentDate: string;
  mpesaCode?: string;
  cashReceivedBy?: string;
  paymentStatus: 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
}
