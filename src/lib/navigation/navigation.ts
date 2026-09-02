import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  PlusCircle,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  CheckCircle,
  ScrollText,
  FileText,
} from 'lucide-react';
import { UserRole } from '../types';

export interface NavItem {
  title: string;
  id: string;
  icon: LucideIcon;
}

export const navByRole: Record<UserRole, NavItem[]> = {
  Youth: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'My Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
  Leader: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'My Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Form Submissions', id: 'form-submissions', icon: FileText },
    { title: 'Check In', id: 'check-in', icon: CheckCircle },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Audit Logs', id: 'audit-logs', icon: ScrollText },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],

  Treasurer: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Users', id: 'users', icon: Users },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Form Submissions', id: 'form-submissions', icon: FileText },
    { title: 'Check In', id: 'check-in', icon: CheckCircle },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Reports', id: 'reports', icon: BarChart3 },
    { title: 'Audit Logs', id: 'audit-logs', icon: ScrollText },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
  Admin: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Users', id: 'users', icon: Users },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Form Submissions', id: 'form-submissions', icon: FileText },
    { title: 'Check In', id: 'check-in', icon: CheckCircle },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Reports', id: 'reports', icon: BarChart3 },
    { title: 'Audit Logs', id: 'audit-logs', icon: ScrollText },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
  Owner: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Users', id: 'users', icon: Users },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Form Submissions', id: 'form-submissions', icon: FileText },
    { title: 'Check In', id: 'check-in', icon: CheckCircle },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Reports', id: 'reports', icon: BarChart3 },
    { title: 'Audit Logs', id: 'audit-logs', icon: ScrollText },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
  SuperAdmin: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Users', id: 'users', icon: Users },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
    { title: 'Form Submissions', id: 'form-submissions', icon: FileText },
    { title: 'Check In', id: 'check-in', icon: CheckCircle },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Reports', id: 'reports', icon: BarChart3 },
    { title: 'Audit Logs', id: 'audit-logs', icon: ScrollText },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
};