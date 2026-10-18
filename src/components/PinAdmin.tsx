"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { listenPinAdmin, PADRAO_PIN_ADMIN, salvarPinAdmin } from "@/lib/configuracoes";
import { liberarPinAdmin, pinAdminLiberado } from "@/lib/sessaoPinAdmin";

// Segunda barreira das telas de admin: pede o PIN uma vez por sessão do
// navegador. Só é montado depois que RequireAdmin confirmou user + admin, ou
// seja, sempre no cliente — por isso a leitura do sessionStorage no estado
// inicial não causa diferença de hidratação.
export default function PinAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [liberado, setLiberado] = useState(() => pinAdminLiberado(uid));
  const [pinCadastrado, setPinCadastrado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [pin, setPin] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (liberado) return;
    return listenPinAdmin((pinAtual) => {
      setPinCadastrado(pinAtual);
      setCarregando(false);
    });
  }, [liberado]);

  if (liberado) return <>{children}</>;

  function liberar() {
    liberarPinAdmin(uid);
    setLiberado(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (pinCadastrado) {
      if (pin === pinCadastrado) {
        liberar();
      } else {
        setErro("PIN incorreto.");
        setPin("");
      }
      return;
    }

    if (!PADRAO_PIN_ADMIN.test(pin)) {
      setErro("O PIN precisa ter de 4 a 6 dígitos.");
      return;
    }
    if (pin !== confirmacao) {
      setErro("Os dois PINs não conferem.");
      return;
    }

    setSalvando(true);
    try {
      await salvarPinAdmin(pin);
      liberar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o PIN.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  const criando = !pinCadastrado;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6"
      >
        <div>
          <h1 className="text-lg font-semibold">{criando ? "Criar PIN de admin" : "PIN de admin"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {criando
              ? "Ainda não há PIN cadastrado. Crie um de 4 a 6 dígitos — ele será pedido pra abrir Funcionários e Configurações."
              : "Digite o PIN pra acessar esta tela."}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pin_admin" className="text-sm font-medium">
            {criando ? "Novo PIN" : "PIN"}
          </label>
          <input
            id="pin_admin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="border rounded px-3 py-2 tracking-widest"
          />
        </div>

        {criando && (
          <div className="flex flex-col gap-1">
            <label htmlFor="pin_admin_confirmacao" className="text-sm font-medium">
              Confirme o PIN
            </label>
            <input
              id="pin_admin_confirmacao"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value.replace(/\D/g, ""))}
              className="border rounded px-3 py-2 tracking-widest"
            />
          </div>
        )}

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={salvando || pin.length === 0}
          className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          {salvando ? "Salvando..." : criando ? "Criar PIN" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
