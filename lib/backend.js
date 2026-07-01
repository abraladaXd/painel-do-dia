import { firebaseEnabled, getFirebaseApp } from "@/lib/firebase";

// -------- backend em memoria (modo local / preview) --------
export function makeLocalBackend() {
  const mem = { config: null, dias: {} };
  return {
    mode: "local",
    async getConfig() { return mem.config; },
    async setConfig(c) { mem.config = structuredClone(c); },
    async getDay(k) { return mem.dias[k] ? structuredClone(mem.dias[k]) : null; },
    async setDay(k, d) { mem.dias[k] = structuredClone(d); },
    async getRange(keys) {
      const o = {};
      keys.forEach((k) => (o[k] = mem.dias[k] ? structuredClone(mem.dias[k]) : null));
      return o;
    },
  };
}

// -------- backend Firestore (login Google + por usuario) --------
export async function makeFirebaseBackend() {
  const app = getFirebaseApp();
  const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } =
    await import("firebase/auth");
  const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");

  const auth = getAuth(app);
  const fs = getFirestore(app);

  const uid = await new Promise((resolve, reject) => {
    let popupTried = false;
    onAuthStateChanged(auth, (u) => {
      if (u) { resolve(u.uid); return; }
      // sem sessao persistida: dispara o popup (uma unica vez)
      if (!popupTried) {
        popupTried = true;
        signInWithPopup(auth, new GoogleAuthProvider()).catch(reject);
      }
    });
  });

  const base = `users/${uid}`;
  return {
    mode: "firebase",
    uid,
    async getConfig() {
      const s = await getDoc(doc(fs, `${base}/meta/config`));
      return s.exists() ? s.data() : null;
    },
    async setConfig(c) { await setDoc(doc(fs, `${base}/meta/config`), c); },
    async getDay(k) {
      const s = await getDoc(doc(fs, `${base}/dias/${k}`));
      return s.exists() ? s.data() : null;
    },
    async setDay(k, d) { await setDoc(doc(fs, `${base}/dias/${k}`), { ...d, updatedAt: Date.now() }); },
    async getRange(keys) {
      const o = {};
      await Promise.all(keys.map(async (k) => {
        const s = await getDoc(doc(fs, `${base}/dias/${k}`));
        o[k] = s.exists() ? s.data() : null;
      }));
      return o;
    },
  };
}

// Memoizado: em dev, o React StrictMode monta os efeitos duas vezes.
// Sem isso, duas chamadas concorrentes a signInWithPopup colidem e o
// Firebase Auth quebra com "INTERNAL ASSERTION FAILED: Pending promise was never set".
let backendPromise = null;
export function initBackend() {
  if (backendPromise) return backendPromise;
  backendPromise = (async () => {
    if (!firebaseEnabled) return makeLocalBackend();
    try {
      return await makeFirebaseBackend();
    } catch (e) {
      console.warn("Firebase indisponivel, usando modo local:", e);
      backendPromise = null; // permite tentar de novo numa proxima chamada
      return makeLocalBackend();
    }
  })();
  return backendPromise;
}
