"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import FecharCaixaModal from "@/components/FecharCaixaModal";
import MovimentacaoCaixaModal from "@/components/MovimentacaoCaixaModal";
import {
  abrirCaixa,
  fecharCaixa,
  listenCaixaAberto,
  listenMovimentacoesCaixa,
  listenUltimoCaixa,
  reabrirCaixa,
  registrarMovimentacaoCaixa,
} from "@/lib/caixa";
import type { Caixa, MovimentacaoCaixa } from "@/types/caixa";

function formatarMoeda(valor: number) {
  return `R$ ${valor.toFixed(2)}`;
}

function formatarDataHora(timestamp?: { toDate: () => Date }) {
  const data = timestamp?.toDate();
  return data ? data.toLocaleString("pt-BR") : "-";
}

export default function CaixaPage() {
  const searchParams = useSearchParams();
  const precisaAbrirParaVender = searchParams.get("motivo") === "inicio-dia";
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [carregandoCaixa, setCarregandoCaixa] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);

  const [valorAbertura, setValorAbertura] = useState("");
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);
  const [erroAbertura, setErroAbertura] = useState<string | null>(null);

  const [ultimoCaixa, setUltimoCaixa] = useState<Caixa | null>(null);
  const [reabrindoCaixa, setReabrindoCaixa] = useState(false);
  const [erroReabertura, setErroReabertura] = useState<string | null>(null);

  const [mostrarModalMovimentacao, setMostrarModalMovimentacao] = useState(false);
  const [mostrarModalFechar, setMostrarModalFechar] = useState(false);
  const [mensagemFechamento, setMensagemFechamento] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenCaixaAberto((caixa) => {
      setCaixaAberto(caixa);
      setCarregandoCaixa(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!caixaAberto) return;
    const unsubscribe = listenMovimentacoesCaixa(caixaAberto.id, setMovimentacoes);
    return unsubscribe;
  }, [caixaAberto]);

  useEffect(() => {
    if (caixaAberto) return;
    const unsubscribe = listenUltimoCaixa(setUltimoCaixa);
    return unsubscribe;
  }, [caixaAberto]);

  const totalSangrias = useMemo(
    () =>
      movimentacoes
        .filter((m) => m.tipo === "sangria")
        .reduce((soma, m) => soma + m.valor, 0),
    [movimentacoes],
  );

  const totalSuprimentos = useMemo(
    () =>
      movimentacoes
        .filter((m) => m.tipo === "suprimento")
        .reduce((soma, m) => soma + m.valor, 0),
    [movimentacoes],
  );

  // Vendas ainda não existem neste sistema; quando entrarem, as vendas em
  // dinheiro do caixa somam aqui também.
  const totalEsperadoDinheiro =
    (caixaAberto?.valor_abertura ?? 0) + totalSuprimentos - totalSangrias;

  async function handleAbrirCaixa(e: FormEvent) {
    e.preventDefault();
    setErroAbertura(null);
    const valorNum = Number(valorAbertura);
    if (valorNum < 0 || valorAbertura.trim() === "") {
      setErroAbertura("Informe o valor inicial em dinheiro (pode ser 0).");
      return;
    }

    setAbrindoCaixa(true);
    try {
      await abrirCaixa(valorNum);
      setValorAbertura("");
      setMensagemFechamento(null);
    } catch (err) {
      setErroAbertura(err instanceof Error ? err.message : "Erro ao abrir caixa.");
    } finally {
      setAbrindoCaixa(false);
    }
  }

  async function handleReabrirCaixa() {
    if (!ultimoCaixa) return;
    setErroReabertura(null);
    const dataFechamentoTexto = formatarDataHora(ultimoCaixa.data_fechamento);
    const confirmado = window.confirm(
      `Isso vai reabrir o caixa fechado em ${dataFechamentoTexto}. Continue só se esqueceu de lançar algo nele.`,
    );
    if (!confirmado) return;

    setReabrindoCaixa(true);
    try {
      await reabrirCaixa(ultimoCaixa.id);
      setMensagemFechamento(null);
    } catch (err) {
      setErroReabertura(err instanceof Error ? err.message : "Erro ao reabrir caixa.");
    } finally {
      setReabrindoCaixa(false);
    }
  }

  async function handleConfirmarMovimentacao(
    tipo: Parameters<typeof registrarMovimentacaoCaixa>[1],
    valor: number,
    motivo: string,
  ) {
    if (!caixaAberto) return;
    await registrarMovimentacaoCaixa(caixaAberto.id, tipo, valor, motivo);
    setMostrarModalMovimentacao(false);
  }

  async function handleConfirmarFechamento(valorContado: number) {
    if (!caixaAberto) return;
    const nomeFuncionario = await fecharCaixa(caixaAberto.id, valorContado);
    const diferenca = valorContado - totalEsperadoDinheiro;
    const textoDiferenca =
      diferenca === 0
        ? "conferiu certinho"
        : diferenca > 0
          ? `sobra de R$ ${diferenca.toFixed(2)}`
          : `falta de R$ ${Math.abs(diferenca).toFixed(2)}`;
    const textoFechadoPor = nomeFuncionario ? ` Fechado por: ${nomeFuncionario}.` : "";
    setMensagemFechamento(`Caixa fechado — ${textoDiferenca}.${textoFechadoPor}`);
    setMostrarModalFechar(false);
  }

  if (carregandoCaixa) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  if (!caixaAberto) {
    return (
      <main className="max-w-md mx-auto p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Caixa</h1>

        {mensagemFechamento && (
          <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">
            {mensagemFechamento}
          </p>
        )}

        {precisaAbrirParaVender && !mensagemFechamento && (
          <p className="text-marca-primaria text-sm bg-marca-primaria/10 rounded-lg px-3 py-2">
            Abra o caixa pra começar o dia.
          </p>
        )}

        <form
          onSubmit={handleAbrirCaixa}
          className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6"
        >
          <p className="text-gray-500 text-sm">Nenhum caixa aberto no momento.</p>

          <div className="flex flex-col gap-1">
            <label htmlFor="valor_abertura" className="text-sm font-medium">
              Valor inicial em dinheiro (troco)
            </label>
            <input
              id="valor_abertura"
              type="number"
              min="0"
              step="0.01"
              value={valorAbertura}
              onChange={(e) => setValorAbertura(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          {erroAbertura && <p className="text-red-600 text-sm">{erroAbertura}</p>}

          <button
            type="submit"
            disabled={abrindoCaixa}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {abrindoCaixa ? "Abrindo..." : "Abrir caixa"}
          </button>
        </form>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleReabrirCaixa}
            disabled={ultimoCaixa?.status !== "fechado" || reabrindoCaixa}
            className="border border-gray-300 text-gray-700 rounded px-4 py-2 disabled:opacity-50"
          >
            {reabrindoCaixa ? "Reabrindo..." : "Reabrir último caixa fechado"}
          </button>
          {erroReabertura && <p className="text-red-600 text-sm">{erroReabertura}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Caixa</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarModalMovimentacao(true)}
            className="bg-marca-primaria text-white rounded px-4 py-2"
          >
            + Sangria / suprimento
          </button>
          <button
            onClick={() => setMostrarModalFechar(true)}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2"
          >
            Fechar caixa
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Aberto desde</p>
          <p className="text-lg font-semibold text-marca-primaria">
            {formatarDataHora(caixaAberto.data_abertura)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Aberto por</p>
          <p className="text-lg font-semibold text-marca-primaria">
            {caixaAberto.aberto_por ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Valor de abertura</p>
          <p className="text-xl font-semibold text-marca-primaria">
            {formatarMoeda(caixaAberto.valor_abertura)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Esperado em dinheiro na gaveta</p>
          <p className="text-xl font-semibold text-marca-primaria">
            {formatarMoeda(totalEsperadoDinheiro)}
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Sangrias e suprimentos</h2>
        {movimentacoes.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Quando</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          m.tipo === "sangria"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {m.tipo === "sangria" ? "Sangria" : "Suprimento"}
                      </span>
                    </td>
                    <td className="py-3 px-4">{m.motivo}</td>
                    <td className="py-3 px-4">{formatarDataHora(m.data_hora)}</td>
                    <td className="py-3 px-4 text-right">
                      {m.tipo === "sangria" ? "-" : "+"}
                      {formatarMoeda(m.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarModalMovimentacao && (
        <MovimentacaoCaixaModal
          onConfirmar={handleConfirmarMovimentacao}
          onFechar={() => setMostrarModalMovimentacao(false)}
        />
      )}

      {mostrarModalFechar && (
        <FecharCaixaModal
          totalEsperado={totalEsperadoDinheiro}
          onConfirmar={handleConfirmarFechamento}
          onFechar={() => setMostrarModalFechar(false)}
        />
      )}
    </main>
  );
}
