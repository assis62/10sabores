"use client";

import { useState, type FormEvent } from "react";
import { PADRAO_PIN_ADMIN, salvarPinAdmin } from "@/lib/configuracoes";

export default function ConfiguracoesPage() {
  const [novoPin, setNovoPin] = useState("");
  const [confirmacaoPin, setConfirmacaoPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [erroPin, setErroPin] = useState<string | null>(null);
  const [mensagemSucessoPin, setMensagemSucessoPin] = useState<string | null>(null);

  async function handleSalvarPin(e: FormEvent) {
    e.preventDefault();
    setErroPin(null);
    setMensagemSucessoPin(null);

    if (!PADRAO_PIN_ADMIN.test(novoPin)) {
      setErroPin("O PIN precisa ter de 4 a 6 dígitos.");
      return;
    }
    if (novoPin !== confirmacaoPin) {
      setErroPin("Os dois PINs não conferem.");
      return;
    }

    setSalvandoPin(true);
    try {
      await salvarPinAdmin(novoPin);
      setNovoPin("");
      setConfirmacaoPin("");
      setMensagemSucessoPin("PIN alterado com sucesso.");
    } catch (err) {
      setErroPin(err instanceof Error ? err.message : "Erro ao salvar o PIN.");
    } finally {
      setSalvandoPin(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <form
        onSubmit={handleSalvarPin}
        className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Segurança</h2>
          <p className="text-sm text-gray-500 mt-1">
            PIN de admin (4 a 6 dígitos), pedido uma vez por sessão do navegador pra abrir
            Funcionários e Configurações. Quem já digitou o PIN antigo nesta sessão continua
            liberado até fechar a aba.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="novo_pin" className="text-sm font-medium">
            Novo PIN
          </label>
          <input
            id="novo_pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={novoPin}
            onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, ""))}
            className="border rounded px-3 py-2 tracking-widest"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmacao_pin" className="text-sm font-medium">
            Confirme o novo PIN
          </label>
          <input
            id="confirmacao_pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={confirmacaoPin}
            onChange={(e) => setConfirmacaoPin(e.target.value.replace(/\D/g, ""))}
            className="border rounded px-3 py-2 tracking-widest"
          />
        </div>

        {erroPin && <p className="text-red-600 text-sm">{erroPin}</p>}
        {mensagemSucessoPin && <p className="text-green-700 text-sm">{mensagemSucessoPin}</p>}

        <button
          type="submit"
          disabled={salvandoPin}
          className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50 self-start"
        >
          {salvandoPin ? "Salvando..." : "Alterar PIN"}
        </button>
      </form>
    </main>
  );
}
