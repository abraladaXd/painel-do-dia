# Painel do Dia

App pessoal de organização diária: obrigações com horário, água, alimentação, treino (início/fim, calorias, peso) e horas trabalhadas com cronômetro. Série temporal por dia no Firestore, undo/redo universal, modo local para rodar sem backend.

Stack: Next.js 14 (App Router) · React 18 · Firebase (Auth Google + Firestore).

## Rodar local

```bash
npm install
npm run dev
# http://localhost:3000
```

Sem `.env.local` o app roda em **modo local** (não persiste ao recarregar) — bom pra testar a interface.

## Ligar o Firebase (persistência + sync entre dispositivos)

1. No [Firebase Console](https://console.firebase.google.com): crie um projeto.
2. **Authentication** → ative o provedor **Google**.
3. **Firestore Database** → crie o banco.
4. Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu app web.
5. Regras do Firestore (só o dono acessa os próprios dados):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

> O login Google usa popup — precisa de origem `http(s)`. Rode via `npm run dev` ou hospede; abrir por `file://` não funciona. Adicione seu domínio em Authentication → Settings → Authorized domains.

## Modelo de dados

- `users/{uid}/dias/{AAAA-MM-DD}` — um documento por dia (a série temporal).
- `users/{uid}/meta/config` — metas e preferências.

Escrita é debounced (350ms). O cronômetro de trabalho só grava ao pausar, trocar de dia ou fechar a aba — não martela o Firestore a cada segundo.

## Subir pro GitHub

Já vem com um commit inicial. Com o [GitHub CLI](https://cli.github.com):

```bash
gh repo create painel-do-dia --private --source=. --remote=origin --push
```

Ou manual:

```bash
git remote add origin git@github.com:SEU_USUARIO/painel-do-dia.git
git branch -M main
git push -u origin main
```

## Deploy no Firebase Hosting

O app é 100% client-side, então usamos **export estático** do Next (`output: "export"` → pasta `out/`) servido pelo Firebase Hosting — sem Cloud Functions, dentro do plano gratuito.

Já vêm configurados `firebase.json` (público = `out/`) e `.firebaserc` (projeto `megabrain-51939`).

```bash
# 1. Gerar o build estático (lê as chaves de .env.local e embute no bundle)
npm run build

# 2. Publicar (usa o Firebase CLI via npx, sem instalar global)
npx firebase-tools login          # só na primeira vez
npx firebase-tools deploy --only hosting
```

Depois do primeiro deploy, adicione o domínio `*.web.app` / `*.firebaseapp.com` (e qualquer domínio custom) em **Authentication → Settings → Authorized domains**, senão o login Google via popup é bloqueado.

> As variáveis `NEXT_PUBLIC_FIREBASE_*` são embutidas no bundle **no momento do build** — sempre rode `npm run build` antes de `deploy`.

### Deploy pela Vercel (alternativa)

Vercel detecta Next.js automaticamente. Configure as mesmas variáveis `NEXT_PUBLIC_FIREBASE_*` no painel do projeto e adicione o domínio do deploy nos Authorized domains do Firebase.
