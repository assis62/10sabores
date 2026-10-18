"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";

function IconeCaixaDinheiro() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6v.01M18 18v-.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconePessoas() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5a6.5 6.5 0 0 1 3 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeEngrenagem() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ATALHOS = [
  {
    href: "/caixa",
    label: "Caixa",
    Icone: IconeCaixaDinheiro,
  },
  {
    href: "/funcionarios",
    label: "Funcionários",
    Icone: IconePessoas,
    somenteAdmin: true,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    Icone: IconeEngrenagem,
    somenteAdmin: true,
  },
];

function AvisoAcessoRestrito() {
  const searchParams = useSearchParams();
  if (searchParams.get("aviso") !== "acesso-restrito") return null;
  return (
    <p className="text-red-700 text-sm bg-red-50 rounded-lg px-3 py-2">
      Acesso restrito — essa tela é só para administradores.
    </p>
  );
}

export default function Home() {
  const { admin } = useAuth();
  const atalhos = ATALHOS.filter((atalho) => admin || !atalho.somenteAdmin);

  return (
    <RequireAuth>
      <main className="max-w-3xl mx-auto p-6 w-full flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Início</h1>
        <Suspense>
          <AvisoAcessoRestrito />
        </Suspense>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {atalhos.map(({ href, label, Icone }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center gap-3 text-center hover:border-marca-primaria transition-colors"
            >
              <span className="rounded-full p-3 bg-gray-100 text-marca-primaria">
                <Icone />
              </span>
              <span className="font-medium text-gray-900">{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </RequireAuth>
  );
}
