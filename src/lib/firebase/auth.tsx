// 3. lib/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, UserRole } from "../types";

export const login = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDocSnap = await getDoc(doc(db, "users", userCredential.user.uid));
  return userDocSnap.exists() ? (userDocSnap.data() as User) : null;
};

export const logout = () => signOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) return callback(null);
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    callback(userDoc.exists() ? (userDoc.data() as User) : null);
  });
};