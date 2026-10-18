import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

function mensagemErroAuth(codigo: string): string {
  switch (codigo) {
    case "auth/email-already-exists":
      return "Já existe uma conta com esse e-mail.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/invalid-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    default:
      return "Erro ao criar a conta de login.";
  }
}

async function tratarRequisicao(request: Request): Promise<NextResponse> {
  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let adminAuth: ReturnType<typeof getAdminAuth>;
  let adminDb: ReturnType<typeof getAdminDb>;
  try {
    adminAuth = getAdminAuth();
    adminDb = getAdminDb();
  } catch {
    return NextResponse.json(
      { erro: "FIREBASE_SERVICE_ACCOUNT_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  let uidSolicitante: string;
  try {
    uidSolicitante = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ erro: "Sessão inválida ou expirada. Entre de novo." }, { status: 401 });
  }

  const solicitante = await adminDb
    .collection("funcionarios")
    .where("uid_auth", "==", uidSolicitante)
    .limit(1)
    .get();
  if (solicitante.docs[0]?.data().admin !== true) {
    return NextResponse.json({ erro: "Acesso restrito." }, { status: 403 });
  }

  let corpo: { nome?: unknown; email?: unknown; senha?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
  const email = typeof corpo.email === "string" ? corpo.email.trim() : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";

  if (!nome) {
    return NextResponse.json({ erro: "Informe o nome do funcionário." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ erro: "Informe o e-mail." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha provisória precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  let uid: string;
  try {
    const usuario = await adminAuth.createUser({ email, password: senha, displayName: nome });
    uid = usuario.uid;
  } catch (err) {
    const codigo = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
    return NextResponse.json({ erro: mensagemErroAuth(codigo) }, { status: 400 });
  }

  try {
    await adminDb.collection("funcionarios").add({
      nome,
      uid_auth: uid,
      ativo: true,
      admin: false,
    });
  } catch {
    // A conta de login já foi criada — não desfaz, só avisa que o cadastro do
    // funcionário precisa ser completado manualmente (mesmo fluxo antigo, com
    // o UID que acabou de ser gerado).
    return NextResponse.json(
      {
        erro: `Conta criada, mas houve um erro ao salvar o cadastro do funcionário. Use "Já tenho uma conta criada" com o UID ${uid} pra completar.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ uid });
}

export async function POST(request: Request) {
  try {
    return await tratarRequisicao(request);
  } catch (err) {
    // Rede de segurança final: garante que a resposta seja sempre um JSON
    // válido mesmo diante de um erro não previsto nos blocos acima (ex.: um
    // formato de erro do Admin SDK que os catches específicos não cobriram),
    // evitando o corpo vazio que quebrava o `resposta.json()` no cliente.
    console.error("Erro inesperado em /api/funcionarios/criar:", err);
    return NextResponse.json({ erro: "Erro inesperado ao cadastrar funcionário. Tente novamente." }, { status: 500 });
  }
}
