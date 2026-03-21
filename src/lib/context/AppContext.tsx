'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Events, Registration } from '../types';
import { db, auth } from '@/lib/firebase/firebase';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface AppContextType {
  currentUser: User | null;
  events: Events[];
  registrations: Registration[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  addEvent: (event: Events) => Promise<void>;
  registerForEvent: (eventId: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthLoading: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Events[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Fetch logged in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setCurrentUser(null);
          return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setCurrentUser({ id: userSnap.id, ...userSnap.data() } as User);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setCurrentUser(null);
      } finally {
        setIsAuthLoading(false); // ✅ ALWAYS runs
      }
    });

    return () => unsubscribe();
  }, []);

  console.log("User AppContext", currentUser)

  // Fetch events
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Events[];

      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch registrations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Registration[];

      setRegistrations(regs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Add event
  const addEvent = useCallback(async (event: Events) => {
    await addDoc(collection(db, 'events'), event);
  }, []);

  // Register for event
  const registerForEvent = useCallback(async (eventId: string) => {
    if (!currentUser) return;

    const event = events.find(e => e.id === eventId);

    const newReg = {
      userId: currentUser.id,
      eventId,
      userName: currentUser.name,
      eventTitle: event?.title || '',
      registrationDate: new Date().toISOString(),
      paymentStatus: 'pending'
    };

    await addDoc(collection(db, 'registrations'), newReg);
  }, [currentUser, events]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);

      // Clear state manually (important for instant UI update)
      setCurrentUser(null);

      console.log("Logging out")

      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        events,
        registrations,
        activeSection,
        setActiveSection,
        addEvent,
        registerForEvent,
        logout,
        isAuthLoading
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