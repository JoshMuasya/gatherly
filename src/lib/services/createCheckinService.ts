import { adminDb } from "../firebase/firebase-admin";

interface CheckinData {
  registrationId: string;
  eventId: string;
  [key: string]: unknown;
}

export const createCheckinService = async (data: CheckinData, orgId: string): Promise<string> => {
  const docRef = await adminDb.collection("checkins").add({
    ...data,
    orgId,
    checkedInAt: new Date(),
  });

  return docRef.id;
};
