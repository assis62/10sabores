"use client";

import { useState, type FormEvent } from "react";
import type { UnidadeBase } from "@/types/catalogo";

const ROTULO_REFERENCIA: Record<UnidadeBase, string> = { g: "kg", ml: "L", un: "un" };

type Props = {
  // custoManual em R$ por unidade base (g, ml ou un).
  onConfirmar: (nome: string, unidadeBase: UnidadeBase, custoManual: number) => Promise<void>;
  onFechar: () => void;
};

export default function InsumoManualModal({ onConfirmar, onFechar }: Props) {
  const [nome, setNome] = useState("");
  const [unidadeBase, setUnidadeBase] = useState<UnidadeBase>("un");
  const [custo, setCusto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const custoReferencia = Number(custo.replace(",", "."));
    if (!nome.trim()) {
      setErro("Informe o nome do insumo.");
      return;
    }
    if (!custo.trim() || !(custoReferencia >= 0)) {
      setErro("Informe o custo.");
      return;
    }

    setSalvando(true);
    try {
      // O custo é digitado por kg/L, que é como se pensa; grava por g/ml.
      const custoManual = unidadeBase === "un" ? custoReferencia : custoReferencia / 1000;
      await onConfirmar(nome.trim(), unidadeBase, custoManual);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar insumo.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Insumo manual</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pra o que não vem da tabela do fornecedor, como a caixa de pizza ou a massa caseira.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nome_insumo_manual" className="text-sm font-medium">
            Nome
          </label>
          <input
            id="nome_insumo_manual"
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: Caixa de pizza 35 cm"
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Unidade base</span>
          <div className="flex gap-4">
            {(["un", "g", "ml"] as const).map((unidade) => (
              <label key={unidade} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="unidade_insumo_manual"
                  checked={unidadeBase === unidade}
                  onChange={() => setUnidadeBase(unidade)}
                />
                {unidade}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="custo_insumo_manual" className="text-sm font-medium">
            Custo (R$ por {ROTULO_REFERENCIA[unidadeBase]})
          </label>
          <input
            id="custo_insumo_manual"
            inputMode="decimal"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
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
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
          <button type="button" onClick={onFechar} className="border rounded px-4 py-2 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
