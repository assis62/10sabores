"use client";

import { useMemo, useState } from "react";
import { custoNaReferencia, formatarReais, normalizarBusca } from "@/lib/custos";
import type { ItemCatalogo } from "@/types/catalogo";

const LIMITE_RESULTADOS = 60;

type Props = {
  catalogo: ItemCatalogo[];
  idsEmUso: Set<string>;
  onAdicionar: (item: ItemCatalogo) => Promise<void>;
  onFechar: () => void;
};

export default function AdicionarDoCatalogoModal({ catalogo, idsEmUso, onAdicionar, onFechar }: Props) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const disponiveis = useMemo(() => catalogo.filter((item) => item.na_tabela !== false), [catalogo]);
  const categorias = useMemo(
    () => [...new Set(disponiveis.map((item) => item.categoria))].sort((a, b) => a.localeCompare(b)),
    [disponiveis],
  );

  const termo = normalizarBusca(busca);
  const filtrados = disponiveis.filter(
    (item) =>
      (!categoria || item.categoria === categoria) && (!termo || normalizarBusca(item.nome).includes(termo)),
  );

  async function handleAdicionar(item: ItemCatalogo) {
    setErro(null);
    setAdicionando(item.id);
    try {
      await onAdicionar(item);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao adicionar insumo.");
    } finally {
      setAdicionando(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Adicionar do catálogo</h2>
          <button type="button" onClick={onFechar} className="border rounded px-4 py-2 text-sm">
            Fechar
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar por nome"
            className="border rounded px-3 py-2 flex-1"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Filtrar por categoria"
            className="border rounded px-3 py-2"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="overflow-y-auto -mx-6 px-6">
          {disponiveis.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Catálogo vazio. Importe a tabela do fornecedor com scripts/importar-catalogo.mts.
            </p>
          ) : filtrados.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum item encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtrados.slice(0, LIMITE_RESULTADOS).map((item) => {
                const emUso = idsEmUso.has(item.id);
                const custo =
                  item.custo_base === null ? null : custoNaReferencia(item.custo_base, item.unidade_base);
                return (
                  <li key={item.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900">{item.nome}</p>
                      <p className="text-xs text-gray-500">
                        {item.categoria} · {formatarReais(item.preco)} {item.unidade_preco}
                        {custo
                          ? ` · ${formatarReais(custo.valor)}/${custo.rotulo}`
                          : " · falta quantidade"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={emUso || adicionando !== null}
                      onClick={() => handleAdicionar(item)}
                      className="shrink-0 bg-marca-destaque text-marca-primaria font-medium rounded px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      {emUso ? "Já adicionado" : adicionando === item.id ? "Adicionando..." : "Adicionar"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {filtrados.length > LIMITE_RESULTADOS && (
            <p className="text-gray-500 text-xs py-2">
              Mostrando {LIMITE_RESULTADOS} de {filtrados.length}. Refine a busca.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
