"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PinAdmin from "@/components/PinAdmin";
import { useAuth } from "@/context/AuthContext";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, admin, carregandoAdmin } = useAuth();

  useEffect(() => {
    if (user && !carregandoAdmin && !admin) {
      router.replace("/?aviso=acesso-restrito");
    }
  }, [user, carregandoAdmin, admin, router]);

  if (carregandoAdmin || !admin) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  return <PinAdmin>{children}</PinAdmin>;
}
