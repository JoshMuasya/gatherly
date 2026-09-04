import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })
    : getApps()[0];


export const adminAuth = getAuth(app);

// FIREBASE_DATABASE_ID selects a named Firestore database (used to run against
// a region-local database). Unset = the project's "(default)" database.
const databaseId = process.env.FIREBASE_DATABASE_ID;
export const adminDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

export const adminStorage = getStorage(app);