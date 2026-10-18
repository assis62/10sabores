"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProdutoForm from "@/components/ProdutoForm";
import { formatarReais } from "@/lib/custos";
import { calcularCustoFicha, resolverInsumo } from "@/lib/fichaTecnica";
import { listenCatalogo, listenInsumos } from "@/lib/insumos";
import {
  alternarAtivoProduto,
  atualizarProduto,
  criarProduto,
  listenProdutos,
  type DadosProduto,
} from "@/lib/produtos";
import type { ItemCatalogo } from "@/types/catalogo";
import type { Insumo } from "@/types/insumo";
import { CATEGORIAS_PRODUTO, type CategoriaProduto, type Produto } from "@/types/produto";

// id null = produto novo (inclusive o duplicado, que só vira documento ao salvar).
// `versao` remonta o formulário quando se troca de produto sem fechar.
type Edicao = { id: string | null; titulo: string; dados: DadosProduto; versao: number };

function produtoVazio(categoria: CategoriaProduto): DadosProduto {
  return { nome: "", categoria, ativo: true, preco_base: 0, ficha: [], margem_desejada: null };
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [carregando, setCarregando] = useState({ produtos: true, insumos: true, catalogo: true });
  const [filtro, setFiltro] = useState<CategoriaProduto | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const pararProdutos = listenProdutos((lista) => {
      setProdutos(lista);
      setCarregando((atual) => ({ ...atual, produtos: false }));
    });
    const pararInsumos = listenInsumos((lista) => {
      setInsumos(lista);
      setCarregando((atual) => ({ ...atual, insumos: false }));
    });
    const pararCatalogo = listenCatalogo((lista) => {
      setCatalogo(lista);
      setCarregando((atual) => ({ ...atual, catalogo: false }));
    });
    return () => {
      pararProdutos();
      pararInsumos();
      pararCatalogo();
    };
  }, []);

  const insumosResolvidos = useMemo(() => {
    const catalogoPorId = new Map(catalogo.map((item) => [item.id, item]));
    return insumos
      .map((insumo) => resolverInsumo(insumo, catalogoPorId))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [insumos, catalogo]);
  const insumosPorId = useMemo(
    () => new Map(insumosResolvidos.map((insumo) => [insumo.id, insumo])),
    [insumosResolvidos],
  );
  const semInsumos = !carregando.insumos && !insumos.some((i) => i.ativo);

  const visiveis = filtro ? produtos.filter((p) => p.categoria === filtro) : produtos;
  const algumCarregando = carregando.produtos || carregando.insumos || carregando.catalogo;

  function abrir(id: string | null, titulo: string, dados: DadosProduto) {
    setErro(null);
    setEdicao((atual) => ({ id, titulo, dados, versao: (atual?.versao ?? 0) + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSalvar(dados: DadosProduto) {
    if (!edicao) return;
    if (edicao.id) {
      await atualizarProduto(edicao.id, dados);
    } else {
      await criarProduto(dados);
    }
    setEdicao(null);
  }

  async function handleAlternarAtivo(produto: Produto) {
    setErro(null);
    try {
      await alternarAtivoProduto(produto.id, !produto.ativo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao alterar o produto.");
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <button
          type="button"
          disabled={algumCarregando}
          onClick={() => abrir(null, "Novo produto", produtoVazio(filtro ?? "pizza"))}
          className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          Novo produto
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[null, ...CATEGORIAS_PRODUTO].map((categoria) => {
          const quantidade = categoria ? produtos.filter((p) => p.categoria === categoria).length : produtos.length;
          return (
            <button
              key={categoria ?? "todas"}
              type="button"
              onClick={() => setFiltro(categoria)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                filtro === categoria
                  ? "bg-marca-primaria text-white font-medium"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-marca-primaria"
              }`}
            >
              {categoria ?? "todas"} <span className="opacity-70">({quantidade})</span>
            </button>
          );
        })}
      </div>

      {semInsumos && (
        <p className="text-amber-900 text-sm bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          Nenhum insumo cadastrado ainda. Cadastre em{" "}
          <Link href="/insumos" className="underline font-medium">
            Insumos
          </Link>{" "}
          — enquanto isso, dá pra salvar produtos com linhas reservadas e vincular depois.
        </p>
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {edicao && (
        <ProdutoForm
          key={edicao.versao}
          titulo={edicao.titulo}
          inicial={edicao.dados}
          insumos={insumosResolvidos}
          insumosPorId={insumosPorId}
          onSalvar={handleSalvar}
          onCancelar={() => setEdicao(null)}
        />
      )}

      <section>
        {algumCarregando ? (
          <p className="text-gray-500">Carregando...</p>
        ) : visiveis.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {filtro ? `Nenhum produto em ${filtro}.` : "Nenhum produto cadastrado ainda."}
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Preço base</th>
                  <th className="py-3 px-4">Custo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiveis.map((produto) => {
                  const { total, completo } = calcularCustoFicha(produto.ficha, insumosPorId);
                  return (
                    <tr key={produto.id} className={produto.ativo ? "" : "text-gray-400"}>
                      <td className="py-4 px-4">
                        <p className={produto.ativo ? "text-gray-900" : ""}>{produto.nome}</p>
                        <p className="text-xs text-gray-500">
                          {produto.categoria} · {produto.ficha.length} linha(s) na ficha
                        </p>
                      </td>
                      <td className="py-4 px-4 text-sm whitespace-nowrap">{formatarReais(produto.preco_base)}</td>
                      <td className="py-4 px-4 text-sm whitespace-nowrap">
                        {formatarReais(total)}
                        {!completo && <span className="block text-xs text-amber-700">⚠ custo parcial</span>}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => handleAlternarAtivo(produto)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            produto.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrir(produto.id, `Editar ${produto.nome}`, produto)}
                          className="text-sm text-marca-primaria underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            abrir(null, `Duplicar ${produto.nome}`, {
                              ...produto,
                              nome: `${produto.nome} (cópia)`,
                              ficha: produto.ficha.map((linha) => ({ ...linha })),
                            })
                          }
                          className="text-sm text-marca-primaria underline"
                        >
                          Duplicar
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
    </main>
  );
}
