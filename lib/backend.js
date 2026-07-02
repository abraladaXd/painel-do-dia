import { getFirebaseApp } from "@/lib/firebase";

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

// -------- backend Firestore (dados por usuario; auth em lib/auth.js) --------
export async function makeFirebaseBackend(uid) {
  const app = getFirebaseApp();
  const { getFirestore, doc, getDoc, setDoc } = await import("firebase/firestore");

  const fs = getFirestore(app);

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

