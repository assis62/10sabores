"use client";

import { useState, type FormEvent } from "react";

type Props = {
  totalEsperado: number;
  onConfirmar: (valorContado: number) => Promise<void>;
  onFechar: () => void;
};

export default function FecharCaixaModal({ totalEsperado, onConfirmar, onFechar }: Props) {
  const [valorContado, setValorContado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorNum = Number(valorContado) || 0;
  const diferenca = valorContado ? valorNum - totalEsperado : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!valorContado || valorNum < 0) {
      setErro("Informe o valor contado na gaveta.");
      return;
    }

    setSalvando(true);
    try {
      await onConfirmar(valorNum);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao fechar caixa.");
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">Fechar caixa</h2>

        <p className="text-sm text-gray-500">
          Total esperado em dinheiro na gaveta:{" "}
          <span className="font-semibold text-marca-primaria">
            R$ {totalEsperado.toFixed(2)}
          </span>
        </p>

        <div className="flex flex-col gap-1">
          <label htmlFor="valor_contado" className="text-sm font-medium">
            Valor contado na gaveta (R$)
          </label>
          <input
            id="valor_contado"
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={valorContado}
            onChange={(e) => setValorContado(e.target.value)}
            className="border rounded px-3 py-2 text-lg"
          />
        </div>

        {diferenca !== null && (
          <p
            className={`text-sm font-medium ${
              diferenca === 0
                ? "text-green-700"
                : diferenca > 0
                  ? "text-blue-700"
                  : "text-red-600"
            }`}
          >
            {diferenca === 0
              ? "Confere certinho."
              : diferenca > 0
                ? `Sobra de R$ ${diferenca.toFixed(2)}`
                : `Falta de R$ ${Math.abs(diferenca).toFixed(2)}`}
          </p>
        )}

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {salvando ? "Fechando..." : "Confirmar fechamento"}
          </button>
          <button type="button" onClick={onFechar} className="border rounded px-4 py-2">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
