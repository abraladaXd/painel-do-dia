import { initializeApp, getApps } from "firebase/app";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(cfg.apiKey);

export function getFirebaseApp() {
  if (!firebaseEnabled) return null;
  // Usa o próprio domínio de hosting como authDomain. Sem isto, o app roda em
  // *.web.app mas o authDomain é *.firebaseapp.com — domínios distintos fazem o
  // signInWithRedirect entrar em loop (a sessão fica presa no outro domínio por
  // causa do particionamento de storage/cookies, principalmente no celular).
  if (typeof window !== "undefined" && /\.web\.app$|\.firebaseapp\.com$/.test(window.location.hostname)) {
    cfg.authDomain = window.location.hostname;
  }
  return getApps()[0] || initializeApp(cfg);
}
