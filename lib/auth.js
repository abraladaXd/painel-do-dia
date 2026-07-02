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

// Pré-carrega o SDK de auth (chamar no mount da tela de login). Assim, quando o
// usuário toca no botão, o signInWithPopup abre DENTRO do gesto do toque — sem
// isso o Safari/iOS bloqueia o popup por abrir fora do clique.
export function preloadAuth() {
  if (firebaseEnabled) ensureAuth();
}

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
  const { auth, GoogleAuthProvider, signInWithPopup } = await ensureAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" }); // sempre deixa escolher a conta
  await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  const { auth, signOut } = await ensureAuth();
  await signOut(auth);
}
