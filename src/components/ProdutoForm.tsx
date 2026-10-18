"use client";

import { useState, type FormEvent } from "react";
import BuscaInsumoModal from "@/components/BuscaInsumoModal";
import { formatarReais } from "@/lib/custos";
import {
  calcularCustoFicha,
  calcularPrecoSugerido,
  linhaVinculada,
  type InsumoResolvido,
} from "@/lib/fichaTecnica";
import type { DadosProduto } from "@/lib/produtos";
import type { UnidadeBase } from "@/types/catalogo";
import { CATEGORIAS_PRODUTO, type CategoriaProduto, type LinhaFicha } from "@/types/produto";

// Linha em edição: com insumo_id é vinculada, sem é reservada. A quantidade
// fica como texto enquanto se digita.
interface LinhaForm {
  chave: string;
  insumo_id: string | null;
  nome_reservado: string;
  unidade: UnidadeBase;
  quantidade: string;
}

let proximaChave = 0;
function novaChave() {
  proximaChave += 1;
  return `linha-${proximaChave}`;
}

function lerNumero(texto: string): number {
  return Number(texto.replace(",", ".").trim());
}

function paraForm(linha: LinhaFicha): LinhaForm {
  const quantidade = String(linha.quantidade).replace(".", ",");
  if (linhaVinculada(linha)) {
    return { chave: novaChave(), insumo_id: linha.insumo_id, nome_reservado: "", unidade: "g", quantidade };
  }
  return {
    chave: novaChave(),
    insumo_id: null,
    nome_reservado: linha.nome_reservado,
    unidade: linha.unidade,
    quantidade,
  };
}

function paraFicha(linhas: LinhaForm[]): LinhaFicha[] {
  return linhas.map((linha) => {
    const quantidade = lerNumero(linha.quantidade);
    return linha.insumo_id
      ? { insumo_id: linha.insumo_id, quantidade }
      : { nome_reservado: linha.nome_reservado.trim(), quantidade, unidade: linha.unidade };
  });
}

type Props = {
  titulo: string;
  inicial: DadosProduto;
  insumos: InsumoResolvido[];
  insumosPorId: Map<string, InsumoResolvido>;
  onSalvar: (dados: DadosProduto) => Promise<void>;
  onCancelar: () => void;
};

export default function ProdutoForm({ titulo, inicial, insumos, insumosPorId, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [categoria, setCategoria] = useState<CategoriaProduto>(inicial.categoria);
  const [ativo, setAtivo] = useState(inicial.ativo);
  const [precoBase, setPrecoBase] = useState(inicial.preco_base ? String(inicial.preco_base).replace(".", ",") : "");
  const [margem, setMargem] = useState(
    inicial.margem_desejada != null ? String(inicial.margem_desejada).replace(".", ",") : "",
  );
  const [linhas, setLinhas] = useState<LinhaForm[]>(() => inicial.ficha.map(paraForm));
  // null = fechado; "nova" = adicionar linha vinculada; chave = vincular essa linha.
  const [busca, setBusca] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ficha = paraFicha(linhas);
  // Quantidade ainda em branco ou inválida conta como zero só no custo exibido;
  // o salvar recusa.
  const { custos, total, completo } = calcularCustoFicha(
    ficha.map((linha) => ({ ...linha, quantidade: Number.isFinite(linha.quantidade) ? linha.quantidade : 0 })),
    insumosPorId,
  );
  const margemNumero = lerNumero(margem);
  const precoSugerido =
    completo && linhas.length > 0 && margem.trim() ? calcularPrecoSugerido(total, margemNumero) : null;
  const precoNumero = lerNumero(precoBase);
  const linhaVinculando = busca && busca !== "nova" ? linhas.find((l) => l.chave === busca) : undefined;

  function alterarLinha(chave: string, campos: Partial<LinhaForm>) {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
  }

  function handleEscolherInsumo(insumo: InsumoResolvido) {
    if (busca === "nova") {
      setLinhas((atuais) => [
        ...atuais,
        { chave: novaChave(), insumo_id: insumo.id, nome_reservado: "", unidade: insumo.unidade_base, quantidade: "" },
      ]);
    } else if (busca) {
      alterarLinha(busca, { insumo_id: insumo.id });
    }
    setBusca(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!precoBase.trim() || !(precoNumero >= 0)) {
      setErro("Informe o preço base.");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        categoria,
        ativo,
        preco_base: precoNumero,
        ficha,
        margem_desejada: margem.trim() && Number.isFinite(margemNumero) ? margemNumero : null,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar o produto.");
      setSalvando(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold">{titulo}</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="nome_produto" className="text-sm font-medium">
              Nome
            </label>
            <input
              id="nome_produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Pizza Calabresa"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="categoria_produto" className="text-sm font-medium">
              Categoria
            </label>
            <select
              id="categoria_produto"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaProduto)}
              className="border rounded px-3 py-2"
            >
              {CATEGORIAS_PRODUTO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Ficha técnica</span>
          {linhas.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma linha ainda.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {linhas.map((linha, indice) => {
                const insumo = linha.insumo_id ? insumosPorId.get(linha.insumo_id) : undefined;
                const custo = custos[indice];
                return (
                  <li key={linha.chave} className="p-3 flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-48">
                      {linha.insumo_id ? (
                        <p className="text-gray-900">
                          {insumo?.nome ?? "Insumo não encontrado"}
                          {insumo && !insumo.ativo && <span className="text-xs text-gray-500"> (removido)</span>}
                        </p>
                      ) : (
                        <input
                          value={linha.nome_reservado}
                          onChange={(e) => alterarLinha(linha.chave, { nome_reservado: e.target.value })}
                          placeholder="Insumo ainda não cadastrado"
                          aria-label="Nome do insumo reservado"
                          className="border border-amber-300 rounded px-2 py-1 w-full"
                        />
                      )}
                    </div>
                    <input
                      inputMode="decimal"
                      value={linha.quantidade}
                      onChange={(e) => alterarLinha(linha.chave, { quantidade: e.target.value })}
                      placeholder="qtd"
                      aria-label="Quantidade"
                      className="border rounded px-2 py-1 w-20 text-right"
                    />
                    {linha.insumo_id ? (
                      <span className="text-xs text-gray-500 w-8">{insumo?.unidade_base ?? ""}</span>
                    ) : (
                      <select
                        value={linha.unidade}
                        onChange={(e) => alterarLinha(linha.chave, { unidade: e.target.value as UnidadeBase })}
                        aria-label="Unidade"
                        className="border rounded px-1 py-1 text-sm"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </select>
                    )}
                    <span className="text-sm w-24 text-right">
                      {custo === null ? (
                        <span className="text-amber-700" title={linha.insumo_id ? "Insumo sem custo" : "Linha reservada"}>
                          ⚠
                        </span>
                      ) : (
                        formatarReais(custo)
                      )}
                    </span>
                    {!linha.insumo_id && (
                      <button
                        type="button"
                        onClick={() => setBusca(linha.chave)}
                        className="text-sm text-marca-primaria underline"
                      >
                        Vincular
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave))}
                      className="text-sm text-gray-500 hover:text-red-600 underline"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setBusca("nova")} className="border rounded px-3 py-1.5 text-sm">
              + Insumo
            </button>
            <button
              type="button"
              onClick={() =>
                setLinhas((atuais) => [
                  ...atuais,
                  { chave: novaChave(), insumo_id: null, nome_reservado: "", unidade: "g", quantidade: "" },
                ])
              }
              className="border rounded px-3 py-1.5 text-sm"
            >
              + Reservado (ainda não cadastrado)
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-3">
          <p className="text-sm">
            Custo: <strong>{formatarReais(total)}</strong>
            {!completo && <span className="text-amber-700"> · ⚠ custo parcial</span>}
          </p>
          {completo && linhas.length > 0 && precoNumero > 0 && (
            <p className="text-xs text-gray-500">
              Margem com o preço base: {(((precoNumero - total) / precoNumero) * 100).toFixed(1).replace(".", ",")}%
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="margem_produto" className="text-sm font-medium">
              Margem desejada (%)
            </label>
            <input
              id="margem_produto"
              inputMode="decimal"
              value={margem}
              onChange={(e) => setMargem(e.target.value)}
              placeholder="ex: 65"
              className="border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500">
              {precoSugerido !== null
                ? `Preço sugerido: ${formatarReais(precoSugerido)}`
                : !completo
                  ? "Sem preço sugerido enquanto o custo for parcial."
                  : margem.trim() && linhas.length > 0
                    ? "A margem precisa estar entre 0 e 99,99%."
                    : "Informe a margem pra ver o preço sugerido."}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="preco_produto" className="text-sm font-medium">
              Preço base (R$)
            </label>
            <input
              id="preco_produto"
              inputMode="decimal"
              value={precoBase}
              onChange={(e) => setPrecoBase(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={onCancelar} className="border rounded px-4 py-2 text-sm">
            Cancelar
          </button>
        </div>
      </form>

      {busca && (
        <BuscaInsumoModal
          insumos={insumos}
          sugestao={linhaVinculando ? { nome: linhaVinculando.nome_reservado, unidade: linhaVinculando.unidade } : undefined}
          onEscolher={handleEscolherInsumo}
          onFechar={() => setBusca(null)}
        />
      )}
    </>
  );
}
