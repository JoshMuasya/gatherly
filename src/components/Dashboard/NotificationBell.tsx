'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, limit, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useApp } from '@/lib/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppNotification {
  id: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function NotificationBell() {
  const { currentUser, activeOrgId } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser?.id || !activeOrgId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      limit(50)
    );

    unsubRef.current = onSnapshot(q, (snap) => {
      const all = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AppNotification, 'id'>) }));
      const filtered = all
        .filter((n) => n.orgId === activeOrgId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20);
      setNotifications(filtered);
    });

    return () => { unsubRef.current?.(); };
  }, [currentUser?.id, activeOrgId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!currentUser?.id || !activeOrgId || unreadCount === 0) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      where('orgId', '==', activeOrgId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
    await batch.commit();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[10px] text-white font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 ${n.read ? '' : 'bg-blue-50 dark:bg-blue-950/20'}`}
              >
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}