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
  ],
  Leader: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'My Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Registrations', id: 'registrations', icon: ClipboardList },
  ],
  Admin: [
    { title: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { title: 'Events', id: 'events', icon: Calendar },
    { title: 'Create Event', id: 'create-event', icon: PlusCircle },
    { title: 'Users', id: 'users', icon: Users },
    { title: 'Payments', id: 'payments', icon: CreditCard },
    { title: 'Reports', id: 'reports', icon: BarChart3 },
    { title: 'Settings', id: 'settings', icon: Settings },
  ],
};