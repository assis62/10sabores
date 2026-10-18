"use client";

import { useEffect, useState, type FormEvent } from "react";
import { alternarAtivoFuncionario, criarFuncionario, listenFuncionarios } from "@/lib/funcionarios";
import { auth } from "@/lib/firebase";
import type { Funcionario } from "@/types/funcionario";

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modoManual, setModoManual] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{ email: string; senha: string } | null>(
    null,
  );

  const [nomeManual, setNomeManual] = useState("");
  const [uidAuth, setUidAuth] = useState("");
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [erroManual, setErroManual] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenFuncionarios((lista) => {
      setFuncionarios(lista);
      setCarregando(false);
    });
    return unsubscribe;
  }, []);

  async function handleCriar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCredenciaisCriadas(null);

    if (!nome.trim()) {
      setErro("Informe o nome do funcionário.");
      return;
    }
    if (!email.trim()) {
      setErro("Informe o e-mail.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha provisória precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSalvando(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Sessão inválida. Saia e entre de novo.");
      }
      const resposta = await fetch("/api/funcionarios/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        throw new Error(dados?.erro ?? `Erro ao cadastrar funcionário (${resposta.status}).`);
      }
      setCredenciaisCriadas({ email: email.trim(), senha });
      setNome("");
      setEmail("");
      setSenha("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar funcionário.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSubmitManual(e: FormEvent) {
    e.preventDefault();
    setErroManual(null);

    if (!nomeManual.trim()) {
      setErroManual("Informe o nome do funcionário.");
      return;
    }
    if (!uidAuth.trim()) {
      setErroManual("Informe o UID do Firebase Auth (copiado do Console).");
      return;
    }

    setSalvandoManual(true);
    try {
      await criarFuncionario(nomeManual.trim(), uidAuth.trim());
      setNomeManual("");
      setUidAuth("");
    } catch (err) {
      setErroManual(err instanceof Error ? err.message : "Erro ao cadastrar funcionário.");
    } finally {
      setSalvandoManual(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Funcionários</h1>

      {!modoManual ? (
        <form
          onSubmit={handleCriar}
          className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold">Novo funcionário</h2>

          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium">
              Nome
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Maria Silva"
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: maria@10sabores.com"
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha provisória
            </label>
            <input
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="pelo menos 6 caracteres"
              className="border rounded px-3 py-2 font-mono"
            />
          </div>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50 self-start"
          >
            {salvando ? "Cadastrando..." : "Cadastrar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setModoManual(true);
              setErro(null);
              setCredenciaisCriadas(null);
            }}
            className="text-sm text-marca-primaria underline self-start"
          >
            Já tenho uma conta criada
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmitManual}
          className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold">Vincular conta já existente</h2>
          <p className="text-sm text-gray-500">
            Pra casos raros em que a conta de login já foi criada direto pelo Firebase
            Console. Esse cadastro só vincula o nome ao UID, pra identificar quem abriu
            ou fechou o caixa.
          </p>

          <div className="flex flex-col gap-1">
            <label htmlFor="nome_manual" className="text-sm font-medium">
              Nome
            </label>
            <input
              id="nome_manual"
              value={nomeManual}
              onChange={(e) => setNomeManual(e.target.value)}
              placeholder="ex: Maria Silva"
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uid_auth" className="text-sm font-medium">
              UID do Firebase Auth
            </label>
            <input
              id="uid_auth"
              value={uidAuth}
              onChange={(e) => setUidAuth(e.target.value)}
              placeholder="copiado de Authentication → Users, no Firebase Console"
              className="border rounded px-3 py-2 font-mono text-sm"
            />
          </div>

          {erroManual && <p className="text-red-600 text-sm">{erroManual}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvandoManual}
              className="bg-marca-destaque text-marca-primaria font-medium rounded px-4 py-2 disabled:opacity-50"
            >
              {salvandoManual ? "Salvando..." : "Vincular"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModoManual(false);
                setErroManual(null);
              }}
              className="border rounded px-4 py-2 text-sm"
            >
              Voltar pro cadastro normal
            </button>
          </div>
        </form>
      )}

      {credenciaisCriadas && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">Funcionário cadastrado com sucesso!</p>
          <p className="text-sm text-amber-800">
            Anote ou passe a senha provisória pra pessoa agora — ela{" "}
            <strong>não pode ser recuperada depois</strong> de sair dessa tela.
          </p>
          <div className="flex flex-col gap-1 bg-white rounded border border-amber-200 p-3 font-mono text-sm">
            <span>E-mail: {credenciaisCriadas.email}</span>
            <span>Senha: {credenciaisCriadas.senha}</span>
          </div>
          <button
            type="button"
            onClick={() => setCredenciaisCriadas(null)}
            className="self-start text-sm text-amber-900 underline"
          >
            Já anotei
          </button>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">Cadastrados</h2>
        {carregando ? (
          <p className="text-gray-500">Carregando...</p>
        ) : funcionarios.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum funcionário cadastrado ainda.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {funcionarios.map((f) => (
                  <tr key={f.id}>
                    <td className="py-4 px-4 text-gray-900">{f.nome}</td>
                    <td className="py-4 px-4 font-mono text-xs text-gray-500">{f.uid_auth}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{f.admin ? "Sim" : "—"}</td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => alternarAtivoFuncionario(f.id, !f.ativo)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          f.ativo
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {f.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
