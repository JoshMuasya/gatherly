'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Events, Registration, OrgSummary } from '../types';
import { db, auth } from '@/lib/firebase/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

const ACTIVE_ORG_KEY = "gatherly:activeOrgId";

interface AppContextType {
  currentUser: User | null;
  events: Events[];
  registrations: Registration[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  logout: () => Promise<void>;
  isAuthLoading: boolean;
  // Multi-org
  activeOrgId: string | null;
  userOrgs: OrgSummary[];
  switchOrg: (orgId: string) => void;
  loadingOrgs: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Events[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [userOrgs, setUserOrgs] = useState<OrgSummary[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Restore active org from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    if (stored) setActiveOrgId(stored);
  }, []);

  // Auth state — subscribe to Firestore user doc so profile changes reflect immediately
  useEffect(() => {
    let userUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (userUnsub) { userUnsub(); userUnsub = null; }

      if (!firebaseUser) {
        setCurrentUser(null);
        setEvents([]);
        setRegistrations([]);
        setUserOrgs([]);
        setActiveOrgId(null);
        setIsAuthLoading(false);
        return;
      }

      let firstSnapshot = true;

      userUnsub = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          if (!snap.exists()) {
            setCurrentUser(null);
            setIsAuthLoading(false);
            return;
          }

          const user = { id: snap.id, ...snap.data() } as User;
          setCurrentUser(user);

          // Only set active org on the very first snapshot (initial login)
          if (firstSnapshot) {
            firstSnapshot = false;
            const stored = localStorage.getItem(ACTIVE_ORG_KEY);
            const initialOrg = stored ?? user.orgId ?? null;
            if (initialOrg && !stored) {
              localStorage.setItem(ACTIVE_ORG_KEY, initialOrg);
            }
            setActiveOrgId(initialOrg);
          }

          setIsAuthLoading(false);
        },
        (error) => {
          console.error('[user-snapshot] error:', error);
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  // Load user's orgs after login
  useEffect(() => {
    if (!currentUser) { setUserOrgs([]); return; }

    let cancelled = false;
    setLoadingOrgs(true);

    api.get<OrgSummary[]>('/api/organizations/mine')
      .then(orgs => { if (!cancelled) setUserOrgs(Array.isArray(orgs) ? orgs : []); })
      .catch(() => { if (!cancelled) setUserOrgs([]); })
      .finally(() => { if (!cancelled) setLoadingOrgs(false); });

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Events — scoped to active org
  useEffect(() => {
    const orgId = activeOrgId ?? currentUser?.orgId;
    if (!orgId) { setEvents([]); return; }

    const q = query(collection(db, 'events'), where('orgId', '==', orgId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Events[];
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setEvents(data);
    });

    return () => unsubscribe();
  }, [activeOrgId, currentUser?.orgId]);

  // Registrations — scoped to active org + current user
  useEffect(() => {
    const orgId = activeOrgId ?? currentUser?.orgId;
    if (!currentUser?.id || !orgId) { setRegistrations([]); return; }

    const q = query(
      collection(db, 'registrations'),
      where('orgId', '==', orgId),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Registration[];
      setRegistrations(data);
    });

    return () => unsubscribe();
  }, [currentUser?.id, activeOrgId, currentUser?.orgId]);

  const switchOrg = useCallback((orgId: string) => {
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    setActiveOrgId(orgId);
    // Clear all React Query caches so data re-fetches for the new org
    queryClient.clear();
    setActiveSection('dashboard');
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setEvents([]);
      setRegistrations([]);
      setUserOrgs([]);
      setActiveOrgId(null);
      localStorage.removeItem(ACTIVE_ORG_KEY);
      queryClient.clear();
      router.push('/auth/login');
    } catch (error) {
      console.error('[auth] logout error:', error);
    }
  }, [router, queryClient]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        events,
        registrations,
        activeSection,
        setActiveSection,
        logout,
        isAuthLoading,
        activeOrgId,
        userOrgs,
        switchOrg,
        loadingOrgs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
