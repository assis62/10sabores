"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import AdicionarDoCatalogoModal from "@/components/AdicionarDoCatalogoModal";
import {
  calcularCustoInsumo,
  custoNaReferencia,
  formatarPesoVolume,
  formatarReais,
} from "@/lib/custos";
import {
  adicionarInsumo,
  atualizarInsumo,
  listenCatalogo,
  listenInsumos,
  removerInsumo,
  salvarQtdPorEmbalagem,
} from "@/lib/insumos";
import type { ItemCatalogo } from "@/types/catalogo";
import type { Insumo } from "@/types/insumo";

function lerNumero(texto: string): number {
  return Number(texto.replace(",", ".").trim());
}

// Campo que grava ao sair (blur). Quem usa passa uma `key` com o valor salvo,
// pra que uma mudança vinda do Firestore remonte o campo com o valor novo.
function CampoNumero({
  valor,
  sufixo,
  rotulo,
  minimo,
  onSalvar,
}: {
  valor: number;
  sufixo: string;
  rotulo: string;
  minimo: number;
  onSalvar: (valor: number) => Promise<void>;
}) {
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  const [erro, setErro] = useState(false);

  async function handleBlur() {
    const numero = lerNumero(texto);
    if (!Number.isFinite(numero) || numero < minimo) {
      setErro(true);
      setTexto(String(valor).replace(".", ","));
      return;
    }
    setErro(false);
    if (numero !== valor) {
      try {
        await onSalvar(numero);
      } catch {
        setErro(true);
      }
    }
  }

  return (
    <label className="inline-flex items-center gap-1">
      <input
        inputMode="decimal"
        aria-label={rotulo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={handleBlur}
        className={`border rounded px-2 py-1 w-24 text-right ${erro ? "border-red-500" : ""}`}
      />
      <span className="text-xs text-gray-500">{sufixo}</span>
    </label>
  );
}

function FormQtdPorEmbalagem({ item, emUso }: { item: ItemCatalogo; emUso: boolean }) {
  const [qtd, setQtd] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await salvarQtdPorEmbalagem(item, Number(qtd));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
      setSalvando(false);
    }
  }

  return (
    <li className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-gray-900">
          {item.nome}
          {emUso && (
            <span className="ml-2 inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
              em uso
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {formatarReais(item.preco)} {item.unidade_preco}
          {item.peso_volume && ` · ${formatarPesoVolume(item.peso_volume)} cada`}
        </p>
        {erro && <p className="text-red-600 text-xs">{erro}</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          placeholder="qtd"
          aria-label={`Quantidade por embalagem de ${item.nome}`}
          className="border rounded px-2 py-1 w-20 text-right"
        />
        <span className="text-xs text-gray-500">por {item.unidade_preco}</span>
        <button
          type="submit"
          disabled={salvando || !qtd}
          className="bg-marca-destaque text-marca-primaria font-medium rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </li>
  );
}

export default function InsumosPage() {
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [carregandoInsumos, setCarregandoInsumos] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const pararCatalogo = listenCatalogo((lista) => {
      setCatalogo(lista);
      setCarregandoCatalogo(false);
    });
    const pararInsumos = listenInsumos((lista) => {
      setInsumos(lista);
      setCarregandoInsumos(false);
    });
    return () => {
      pararCatalogo();
      pararInsumos();
    };
  }, []);

  const catalogoPorId = useMemo(() => new Map(catalogo.map((item) => [item.id, item])), [catalogo]);
  const emUso = useMemo(() => insumos.filter((i) => i.ativo), [insumos]);
  const idsEmUso = useMemo(() => new Set(emUso.map((i) => i.catalogo_id)), [emUso]);

  const linhas = emUso
    .map((insumo) => ({ insumo, item: catalogoPorId.get(insumo.catalogo_id) }))
    .sort((a, b) => (a.item?.nome ?? "").localeCompare(b.item?.nome ?? ""));

  const faltaQuantidade = catalogo
    .filter((item) => item.falta_quantidade && item.na_tabela !== false)
    .sort((a, b) => Number(idsEmUso.has(b.id)) - Number(idsEmUso.has(a.id)));

  async function salvarCampo(id: string, campos: Parameters<typeof atualizarInsumo>[1]) {
    setErro(null);
    try {
      await atualizarInsumo(id, campos);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o insumo.");
      throw err;
    }
  }

  async function handleRemover(id: string) {
    setErro(null);
    try {
      await removerInsumo(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover o insumo.");
    }
  }

  const carregando = carregandoCatalogo || carregandoInsumos;

  return (
    <main className="max-w-5xl mx-auto p-6 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Insumos</h1>
        <button
          type="button"
          disabled={carregando}
          onClick={() => setModalAberto(true)}
          className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          Adicionar do catálogo
        </button>
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      <section>
        <h2 className="text-lg font-semibold mb-2">Em uso</h2>
        {carregando ? (
          <p className="text-gray-500">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum insumo ainda. Use “Adicionar do catálogo”.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4">Custo</th>
                  <th className="py-3 px-4">Rendimento</th>
                  <th className="py-3 px-4">Estoque atual</th>
                  <th className="py-3 px-4">Estoque mínimo</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linhas.map(({ insumo, item }) => {
                  const custo = calcularCustoInsumo(item?.custo_base ?? null, insumo.rendimento);
                  const referencia = custo === null ? null : custoNaReferencia(custo, insumo.unidade_base);
                  const abaixoDoMinimo =
                    insumo.estoque_minimo > 0 && insumo.estoque_atual < insumo.estoque_minimo;
                  return (
                    <tr key={insumo.id}>
                      <td className="py-4 px-4">
                        <p className="text-gray-900">{item?.nome ?? "Item do catálogo não encontrado"}</p>
                        {item && (
                          <p className="text-xs text-gray-500">
                            {item.categoria} · {formatarReais(item.preco)} {item.unidade_preco}
                            {item.na_tabela === false && (
                              <span className="text-red-600"> · saiu da tabela do fornecedor</span>
                            )}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm whitespace-nowrap">
                        {referencia ? (
                          `${formatarReais(referencia.valor)}/${referencia.rotulo}`
                        ) : !item ? (
                          "—"
                        ) : (
                          <span className="text-amber-700">falta quantidade</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <CampoNumero
                          key={`rendimento-${insumo.rendimento}`}
                          valor={insumo.rendimento}
                          sufixo="%"
                          rotulo="Rendimento"
                          minimo={0.01}
                          onSalvar={(rendimento) => salvarCampo(insumo.id, { rendimento })}
                        />
                      </td>
                      <td className={`py-4 px-4 ${abaixoDoMinimo ? "bg-red-50" : ""}`}>
                        <CampoNumero
                          key={`atual-${insumo.estoque_atual}`}
                          valor={insumo.estoque_atual}
                          sufixo={insumo.unidade_base}
                          rotulo="Estoque atual"
                          minimo={0}
                          onSalvar={(estoque_atual) => salvarCampo(insumo.id, { estoque_atual })}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <CampoNumero
                          key={`minimo-${insumo.estoque_minimo}`}
                          valor={insumo.estoque_minimo}
                          sufixo={insumo.unidade_base}
                          rotulo="Estoque mínimo"
                          minimo={0}
                          onSalvar={(estoque_minimo) => salvarCampo(insumo.id, { estoque_minimo })}
                        />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemover(insumo.id)}
                          className="text-sm text-gray-500 hover:text-red-600 underline"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!carregando && faltaQuantidade.length > 0 && (
        <section className="flex flex-col gap-2 bg-white rounded-xl border border-amber-300 p-6">
          <div>
            <h2 className="text-lg font-semibold">Falta quantidade por embalagem</h2>
            <p className="text-sm text-gray-500 mt-1">
              Itens vendidos em caixa, fardo ou balde sem a quantidade de unidades dentro. Sem ela não
              dá pra calcular o custo. A reimportação da tabela mantém o que for preenchido aqui.
            </p>
          </div>
          <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {faltaQuantidade.map((item) => (
              <FormQtdPorEmbalagem key={item.id} item={item} emUso={idsEmUso.has(item.id)} />
            ))}
          </ul>
        </section>
      )}

      {modalAberto && (
        <AdicionarDoCatalogoModal
          catalogo={catalogo}
          idsEmUso={idsEmUso}
          onAdicionar={(item) => adicionarInsumo(item, insumos).then(() => undefined)}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </main>
  );
}
