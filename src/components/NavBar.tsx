"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { limparPinAdmin } from "@/lib/sessaoPinAdmin";

type ItemMenu = { href: string; label: string; somenteAdmin?: boolean };

const ITENS_DIRETOS = [{ href: "/caixa", label: "Caixa" }];

const GRUPO_PRODUCAO: ItemMenu[] = [
  { href: "/produtos", label: "Produtos", somenteAdmin: true },
  { href: "/insumos", label: "Insumos", somenteAdmin: true },
];

const GRUPO_EQUIPE: ItemMenu[] = [{ href: "/funcionarios", label: "Funcionários", somenteAdmin: true }];

const GRUPO_SISTEMA: ItemMenu[] = [{ href: "/configuracoes", label: "Configurações", somenteAdmin: true }];

function IconeSeta({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 12 8"
      fill="none"
      className={`h-2.5 w-2.5 transition-transform ${aberto ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [maisAberto, setMaisAberto] = useState(false);
  const maisRef = useRef<HTMLDivElement>(null);
  const { admin } = useAuth();

  const gruposMais = [GRUPO_PRODUCAO, GRUPO_EQUIPE, GRUPO_SISTEMA]
    .map((grupo) => grupo.filter((item) => admin || !item.somenteAdmin))
    .filter((grupo) => grupo.length > 0);

  function itemAtivo(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  const maisAtivo = gruposMais.flat().some((item) => itemAtivo(item.href));

  useEffect(() => {
    if (!maisAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setMaisAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [maisAberto]);

  async function handleSair() {
    limparPinAdmin();
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="bg-marca-primaria text-white">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className={`shrink-0 rounded-lg p-1 transition-colors ${
            itemAtivo("/") ? "ring-2 ring-marca-destaque" : ""
          }`}
        >
          {/* Logo ainda não definida — por enquanto só o nome. */}
          <span className="block px-2 py-3 text-xl font-semibold tracking-tight">10 Sabores</span>
        </Link>
        <div className="navbar-scroll flex items-center gap-2 text-sm overflow-x-auto">
          {ITENS_DIRETOS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                itemAtivo(item.href)
                  ? "bg-marca-destaque text-marca-primaria font-medium"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {gruposMais.length > 0 && (
          <div ref={maisRef} className="relative shrink-0 text-sm">
            <button
              type="button"
              onClick={() => setMaisAberto((atual) => !atual)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                maisAtivo
                  ? "bg-marca-destaque text-marca-primaria font-medium"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
              }`}
            >
              Mais
              <IconeSeta aberto={maisAberto} />
            </button>

            {maisAberto && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 text-gray-900 shadow-lg">
                {gruposMais.map((grupo, indice) => (
                  <div key={grupo[0].href}>
                    {indice > 0 && <div className="my-1 border-t border-gray-100" />}
                    {grupo.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMaisAberto(false)}
                        className={`block px-4 py-2 text-sm ${
                          itemAtivo(item.href)
                            ? "bg-marca-primaria/5 text-marca-primaria font-medium"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSair}
          className="shrink-0 whitespace-nowrap text-white/80 hover:text-white px-3 py-1.5 text-sm"
        >
          Sair
        </button>
      </nav>
    </header>
  );
}
