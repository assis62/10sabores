"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { listenAdminPorUid } from "@/lib/funcionarios";

type AuthContextValue = {
  user: User | null;
  carregando: boolean;
  admin: boolean;
  carregandoAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  carregando: true,
  admin: false,
  carregandoAdmin: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Guarda de qual UID veio o resultado, pra não reaproveitar o "admin" de um
  // login anterior enquanto o do usuário atual ainda está carregando.
  const [statusAdmin, setStatusAdmin] = useState<{ uid: string; admin: boolean } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCarregando(false);
    });
    return unsubscribe;
  }, []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    return listenAdminPorUid(uid, (admin) => setStatusAdmin({ uid, admin }));
  }, [uid]);

  const statusAtual = uid && statusAdmin?.uid === uid ? statusAdmin : null;
  const admin = statusAtual?.admin ?? false;
  const carregandoAdmin = carregando || (!!uid && !statusAtual);

  return (
    <AuthContext.Provider value={{ user, carregando, admin, carregandoAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
