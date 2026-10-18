"use client";

import { useState } from "react";
import { custoNaReferencia, formatarReais, normalizarBusca } from "@/lib/custos";
import { pontuarSugestao, type InsumoResolvido } from "@/lib/fichaTecnica";
import type { UnidadeBase } from "@/types/catalogo";

type Props = {
  insumos: InsumoResolvido[];
  // Ao vincular uma linha reservada: ordena pelo nome dela e avisa se a
  // unidade do insumo for outra.
  sugestao?: { nome: string; unidade: UnidadeBase };
  onEscolher: (insumo: InsumoResolvido) => void;
  onFechar: () => void;
};

export default function BuscaInsumoModal({ insumos, sugestao, onEscolher, onFechar }: Props) {
  const [busca, setBusca] = useState("");

  const termo = normalizarBusca(busca);
  const lista = insumos
    .filter((insumo) => insumo.ativo && (!termo || normalizarBusca(insumo.nome).includes(termo)))
    .map((insumo) => ({ insumo, pontos: sugestao ? pontuarSugestao(sugestao.nome, insumo.nome) : 0 }))
    .sort((a, b) => b.pontos - a.pontos || a.insumo.nome.localeCompare(b.insumo.nome));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            {sugestao ? `Vincular “${sugestao.nome}”` : "Escolher insumo"}
          </h2>
          <button type="button" onClick={onFechar} className="border rounded px-4 py-2 text-sm">
            Fechar
          </button>
        </div>

        <input
          type="search"
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar insumo"
          aria-label="Buscar insumo"
          className="border rounded px-3 py-2"
        />

        <div className="overflow-y-auto -mx-6 px-6">
          {lista.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {insumos.some((i) => i.ativo) ? "Nenhum insumo encontrado." : "Nenhum insumo cadastrado ainda."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lista.map(({ insumo, pontos }) => {
                const custo = insumo.custo === null ? null : custoNaReferencia(insumo.custo, insumo.unidade_base);
                const outraUnidade = sugestao && sugestao.unidade !== insumo.unidade_base;
                return (
                  <li key={insumo.id}>
                    <button
                      type="button"
                      onClick={() => onEscolher(insumo)}
                      className="w-full text-left py-3 flex items-center gap-3 hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900">
                          {insumo.nome}
                          {pontos > 0 && (
                            <span className="ml-2 inline-flex rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                              sugerido
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {custo ? `${formatarReais(custo.valor)}/${custo.rotulo}` : "⚠ sem custo"} · em{" "}
                          {insumo.unidade_base}
                          {outraUnidade && (
                            <span className="text-amber-700">
                              {" "}
                              · a linha está em {sugestao?.unidade}, confira a quantidade
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
