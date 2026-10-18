"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import NavBar from "@/components/NavBar";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, carregando } = useAuth();

  useEffect(() => {
    if (!carregando && !user) {
      router.replace("/login");
    }
  }, [carregando, user, router]);

  if (carregando || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      {children}
    </div>
  );
}
