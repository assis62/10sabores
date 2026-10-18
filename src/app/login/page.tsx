"use client";

import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthCredential,
  type AuthError,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCaixaAbertoId } from "@/lib/caixa";
import { auth } from "@/lib/firebase";

function mensagemErro(codigo: string) {
  switch (codigo) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha de conexão. Tente novamente.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Permita pop-ups pra esse site e tente de novo.";
    case "auth/operation-not-supported-in-this-environment":
      return "Esse navegador não suporta login com Google aqui (comum em navegador interno de apps como Instagram/WhatsApp). Abra o link no Chrome ou Safari normal.";
    case "auth/unauthorized-domain":
      return "Esse domínio não está autorizado a fazer login com Google. Avise o suporte.";
    default:
      return "Não foi possível entrar. Tente novamente.";
  }
}

function codigoErro(err: unknown): string {
  return err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, carregando: carregandoAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [entrandoGoogle, setEntrandoGoogle] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCodigoGoogle, setErroCodigoGoogle] = useState<string | null>(null);

  const [credencialGooglePendente, setCredencialGooglePendente] = useState<AuthCredential | null>(
    null,
  );
  const [emailVinculo, setEmailVinculo] = useState("");
  const [senhaVinculo, setSenhaVinculo] = useState("");
  const [vinculando, setVinculando] = useState(false);

  useEffect(() => {
    if (!carregandoAuth && user) {
      finalizarLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoAuth, user]);

  async function finalizarLogin() {
    const caixaId = await getCaixaAbertoId();
    router.replace(caixaId ? "/" : "/caixa?motivo=inicio-dia");
  }

  // Retorna true se o erro foi tratado como "e-mail já cadastrado com senha"
  // (mesmo padrão do AcheAquiLocal): em vez de criar um login solto, pede a
  // senha existente e vincula a credencial do Google a essa mesma conta com
  // linkWithCredential, unificando o UID.
  function tratarErroVinculoGoogle(err: unknown): boolean {
    if (codigoErro(err) !== "auth/account-exists-with-different-credential") return false;
    const credencial = GoogleAuthProvider.credentialFromError(err as AuthError);
    const emailExistente = (err as AuthError).customData?.email;
    if (!credencial || !emailExistente) return false;
    setCredencialGooglePendente(credencial);
    setEmailVinculo(emailExistente);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      await finalizarLogin();
    } catch (err) {
      setErro(mensagemErro(codigoErro(err)));
    } finally {
      setEntrando(false);
    }
  }

  async function handleEntrarComGoogle() {
    setErro(null);
    setErroCodigoGoogle(null);
    setEntrandoGoogle(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      await finalizarLogin();
    } catch (err) {
      const codigo = codigoErro(err);
      if (codigo === "auth/popup-closed-by-user" || codigo === "auth/cancelled-popup-request") {
        setEntrandoGoogle(false);
        return;
      }
      if (tratarErroVinculoGoogle(err)) {
        setEntrandoGoogle(false);
        return;
      }
      setErro(mensagemErro(codigo));
      // Código bruto visível pra diagnóstico caso a mensagem amigável não seja
      // suficiente pra identificar a causa (ex.: em navegadores/dispositivos
      // específicos que ainda falhem por outro motivo).
      setErroCodigoGoogle(codigo || null);
      setEntrandoGoogle(false);
    }
  }

  async function handleVincularGoogle(e: FormEvent) {
    e.preventDefault();
    if (!credencialGooglePendente) return;
    setErro(null);
    setVinculando(true);
    try {
      const resultado = await signInWithEmailAndPassword(auth, emailVinculo, senhaVinculo);
      await linkWithCredential(resultado.user, credencialGooglePendente);
      setCredencialGooglePendente(null);
      await finalizarLogin();
    } catch (err) {
      setErro(mensagemErro(codigoErro(err)));
    } finally {
      setVinculando(false);
    }
  }

  if (carregandoAuth || user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </main>
    );
  }

  if (credencialGooglePendente) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <form
          onSubmit={handleVincularGoogle}
          className="flex flex-col gap-4 w-full max-w-sm border rounded p-6"
        >
          <h1 className="text-xl font-semibold text-center">Vincular conta Google</h1>
          <p className="text-sm text-gray-500 text-center">
            Já existe uma conta com o e-mail <strong>{emailVinculo}</strong> usando senha.
            Confirme a senha pra vincular o login do Google a essa conta.
          </p>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha-vinculo" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="senha-vinculo"
              type="password"
              autoComplete="current-password"
              value={senhaVinculo}
              onChange={(e) => setSenhaVinculo(e.target.value)}
              className="border rounded px-3 py-2"
              required
              autoFocus
            />
          </div>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={vinculando}
            className="bg-marca-primaria text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {vinculando ? "Vinculando..." : "Vincular e entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCredencialGooglePendente(null);
              setSenhaVinculo("");
              setErro(null);
            }}
            className="text-sm text-gray-500 underline"
          >
            Cancelar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm border rounded p-6"
      >
        <h1 className="text-xl font-semibold text-center">10 Sabores</h1>
        <p className="text-sm text-gray-500 text-center">
          Entre com seu e-mail e senha.
        </p>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={entrando}
          className="bg-marca-primaria text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          ou
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleEntrarComGoogle}
          disabled={entrandoGoogle}
          className="flex items-center justify-center gap-2 border rounded px-4 py-2 disabled:opacity-50 hover:bg-gray-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
            />
          </svg>
          {entrandoGoogle ? "Entrando..." : "Entrar com Google"}
        </button>
        {erroCodigoGoogle && (
          <p className="text-gray-400 text-xs text-center">código: {erroCodigoGoogle}</p>
        )}
      </form>
    </main>
  );
}
