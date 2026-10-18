import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }
  const chave = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!chave) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY não configurada no servidor.");
  }
  return initializeApp({ credential: cert(JSON.parse(chave)) });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
