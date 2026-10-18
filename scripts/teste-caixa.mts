import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const app = initializeApp({ projectId: "sabores-5fe4c", apiKey: "fake-key" });
const db = getFirestore(app);
const auth = getAuth(app);

connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

// Reimplementações fiéis de src/lib/caixa.ts: tsx/esbuild carrega
// "firebase/firestore" em duas instâncias quando importado tanto direto quanto
// via src/lib/*.ts, quebrando `instanceof Firestore`.

async function getCaixaAbertoId(): Promise<string | null> {
  const q = query(collection(db, "caixas"), where("status", "==", "aberto"), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.id ?? null;
}

async function getUltimoCaixaId(): Promise<string | null> {
  const q = query(collection(db, "caixas"), orderBy("data_abertura", "desc"), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.id ?? null;
}

async function abrirCaixa(valorAbertura: number) {
  const existente = await getCaixaAbertoId();
  if (existente) throw new Error("Já existe um caixa aberto.");
  return addDoc(collection(db, "caixas"), {
    data_abertura: serverTimestamp(),
    valor_abertura: valorAbertura,
    status: "aberto",
  });
}

async function fecharCaixa(caixaId: string, valorFechamentoInformado: number) {
  return updateDoc(doc(db, "caixas", caixaId), {
    data_fechamento: serverTimestamp(),
    valor_fechamento_informado: valorFechamentoInformado,
    status: "fechado",
  });
}

async function reabrirCaixa(caixaId: string) {
  const existente = await getCaixaAbertoId();
  if (existente) throw new Error("Já existe um caixa aberto.");
  const ultimoId = await getUltimoCaixaId();
  const ultimo = (await getDoc(doc(db, "caixas", caixaId))).data();
  if (ultimoId !== caixaId || ultimo?.status !== "fechado") {
    throw new Error("Só é possível reabrir o caixa fechado mais recente.");
  }
  await updateDoc(doc(db, "caixas", caixaId), {
    status: "aberto",
    data_fechamento: deleteField(),
    valor_fechamento_informado: deleteField(),
    fechado_por: deleteField(),
  });
}

async function registrarMovimentacaoCaixa(
  caixaId: string,
  tipo: "sangria" | "suprimento",
  valor: number,
  motivo: string,
) {
  return addDoc(collection(db, "movimentacoes_caixa"), {
    caixa_id: caixaId,
    tipo,
    valor,
    motivo,
    data_hora: serverTimestamp(),
  });
}

async function falha(acao: () => Promise<unknown>): Promise<boolean> {
  try {
    await acao();
    return false;
  } catch {
    return true;
  }
}

function assert(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
  console.log(`OK: ${mensagem}`);
}

async function main() {
  await createUserWithEmailAndPassword(auth, "teste-caixa@10sabores.local", "senha123456");

  // Abre o caixa com troco inicial de R$100.
  const caixaRef = await abrirCaixa(100);
  assert(
    await falha(() => abrirCaixa(50)),
    "não permite abrir um segundo caixa enquanto um está aberto",
  );

  // Suprimento de R$20 e sangria de R$15.
  await registrarMovimentacaoCaixa(caixaRef.id, "suprimento", 20, "reforço de troco");
  await registrarMovimentacaoCaixa(caixaRef.id, "sangria", 15, "retirada pro cofre");

  const movimentacoes = await getDocs(
    query(collection(db, "movimentacoes_caixa"), where("caixa_id", "==", caixaRef.id)),
  );
  const totalEsperado =
    100 +
    movimentacoes.docs.reduce((soma, d) => {
      const m = d.data();
      return soma + (m.tipo === "sangria" ? -m.valor : m.valor);
    }, 0);
  assert(totalEsperado === 105, "esperado em dinheiro = abertura + suprimentos - sangrias (105)");

  await fecharCaixa(caixaRef.id, 105);
  const caixaFechado = (await getDoc(caixaRef)).data();
  assert(caixaFechado?.status === "fechado", "caixa fica com status fechado após fecharCaixa");
  assert(caixaFechado?.valor_fechamento_informado === 105, "valor_fechamento_informado gravado corretamente");
  assert((await getCaixaAbertoId()) === null, "não há mais caixa aberto depois de fechar");

  // Reabre o último caixa fechado: volta a ficar aberto e perde os dados de fechamento.
  await reabrirCaixa(caixaRef.id);
  const caixaReaberto = (await getDoc(caixaRef)).data();
  assert(caixaReaberto?.status === "aberto", "reabrir o último caixa volta o status pra aberto");
  assert(
    caixaReaberto?.data_fechamento === undefined && caixaReaberto?.valor_fechamento_informado === undefined,
    "reabrir remove data e valor de fechamento",
  );
  assert(
    await falha(() => reabrirCaixa(caixaRef.id)),
    "não permite reabrir enquanto já há caixa aberto",
  );

  // Fecha de novo, abre um novo e fecha: o primeiro não é mais o último, então não reabre.
  await fecharCaixa(caixaRef.id, 105);
  const novoCaixaRef = await abrirCaixa(200);
  assert((await getCaixaAbertoId()) === novoCaixaRef.id, "consegue abrir novo caixa depois do anterior fechado");
  await fecharCaixa(novoCaixaRef.id, 200);
  assert(
    await falha(() => reabrirCaixa(caixaRef.id)),
    "só reabre o caixa fechado mais recente",
  );

  // Regras: sem login, nada é lido nem gravado.
  await signOut(auth);
  assert(await falha(() => getDocs(collection(db, "caixas"))), "regras bloqueiam leitura sem login");
  assert(await falha(() => abrirCaixa(10)), "regras bloqueiam gravação sem login");

  console.log("PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
