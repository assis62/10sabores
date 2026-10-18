"use client";

import { useState, type FormEvent } from "react";
import type { TipoMovimentacaoCaixa } from "@/types/caixa";

type Props = {
  onConfirmar: (tipo: TipoMovimentacaoCaixa, valor: number, motivo: string) => Promise<void>;
  onFechar: () => void;
};

export default function MovimentacaoCaixaModal({ onConfirmar, onFechar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimentacaoCaixa>("sangria");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const valorNum = Number(valor);
    if (!valorNum || valorNum <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    if (!motivo.trim()) {
      setErro("Informe o motivo.");
      return;
    }

    setSalvando(true);
    try {
      await onConfirmar(tipo, valorNum, motivo.trim());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar movimentação.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">Sangria / suprimento</h2>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Tipo</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo_movimentacao_caixa"
                checked={tipo === "sangria"}
                onChange={() => setTipo("sangria")}
              />
              Sangria (retirada)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo_movimentacao_caixa"
                checked={tipo === "suprimento"}
                onChange={() => setTipo("suprimento")}
              />
              Suprimento (reforço)
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="valor" className="text-sm font-medium">
            Valor (R$)
          </label>
          <input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="motivo" className="text-sm font-medium">
            Motivo
          </label>
          <input
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder='ex: "troco pro posto", "reforço de troco"'
            className="border rounded px-3 py-2"
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Registrar"}
          </button>
          <button type="button" onClick={onFechar} className="border rounded px-4 py-2">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
