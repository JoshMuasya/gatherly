import { adminDb } from "../firebase/firebase-admin";

export const getCheckinService = async (eventId: string, orgId: string) => {
  const snapshot = await adminDb
    .collection("checkins")
    .where("orgId", "==", orgId)
    .where("eventId", "==", eventId)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const toSeconds = (v: unknown): number => {
        if (v && typeof v === "object" && "_seconds" in v) return (v as { _seconds: number })._seconds;
        if (typeof v === "string") return new Date(v).getTime() / 1000;
        return 0;
      };
      return toSeconds(b.checkedInAt) - toSeconds(a.checkedInAt);
    });
};
