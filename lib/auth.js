import { firebaseEnabled, getFirebaseApp } from "@/lib/firebase";

// Inicializa o Firebase Auth uma vez, com persistência local (sessão sobrevive
// a refresh/fechar aba — "cookie") e resolve qualquer login por redirect pendente.
let authP = null;
function ensureAuth() {
  if (authP) return authP;
  authP = (async () => {
    const app = getFirebaseApp();
    const {
      getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence,
      onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
      getRedirectResult, signOut,
    } = await import("firebase/auth");
    const auth = getAuth(app);
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
    } catch {
      try { await setPersistence(auth, browserLocalPersistence); } catch {}
    }
    // completa um possível retorno de signInWithRedirect (celular)
    try { await getRedirectResult(auth); } catch {}
    return { auth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut };
  })();
  return authP;
}

const isMobile = () =>
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Observa o estado de login. cb recebe { uid, name, email, photo } ou null.
// Retorna a função de unsubscribe.
export async function watchAuth(cb) {
  if (!firebaseEnabled) { cb(null); return () => {}; }
  const { auth, onAuthStateChanged } = await ensureAuth();
  return onAuthStateChanged(auth, (u) =>
    cb(u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null)
  );
}

export async function signInGoogle() {
  const { auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await ensureAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" }); // sempre deixa escolher a conta
  // celular: popup é bloqueado — vai direto de redirect
  if (isMobile()) return signInWithRedirect(auth, provider);
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const fallback = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"];
    if (fallback.includes(e?.code)) return signInWithRedirect(auth, provider);
    throw e;
  }
}

export async function signOutUser() {
  const { auth, signOut } = await ensureAuth();
  await signOut(auth);
}
