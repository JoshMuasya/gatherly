// "use client";

// import { logout, onAuthChange } from "@/lib/firebase/auth";
// import { User } from "@/lib/types";
// import { useState, useEffect } from "react";

// export function useAuth() {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthChange((firebaseUser) => {
//       setUser(firebaseUser);
//       setLoading(false);
//     });
//     return unsubscribe;
//   }, []);

//   return { user, loading, logout };
// }