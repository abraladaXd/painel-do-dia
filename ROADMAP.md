# Roadmap — Mega Brain (sistema integrado)

> **Princípio:** não são widgets soltos. Tarefas/rotinas são **eventos ligados às dimensões do dia** — marcar num lugar reflete nos outros. O objetivo é um painel completo que ajude de verdade (sono, produtividade, notas), não superficial.

App: Next.js 14 (export estático) · Firebase Hosting `megabrain-51939` → https://megabrain-51939.web.app · dados por usuário no Firestore.

---

## ✅ Fase 0 — Base (feito)
- Hosting no Firebase (export estático `out/` + `firebase.json` + `.firebaserc`).
- Responsividade: viewport meta, safe-area, tabela da Semana com scroll no mobile.
- Layout **masonry unificado** (`.cards`) — acaba com o espaço vazio.
- **Rotinas**: tarefas repetidas por horário + dias da semana (aba Config), semeadas em cada novo dia, marcador ↻.

## ✅ Fase 1 — Integração rotina↔módulos (feito)
Cada rotina/tarefa tem um **vínculo** (`link`) com um módulo, com sync **bidirecional**:
- `treino`, `sono:deitar`, `sono:acordar`, `refeicao:<nome>` — marcar a tarefa mexe no módulo e vice-versa.
- Config: seletor de vínculo no editor de rotina.
- Rotinas viraram **quadro semanal** (7 colunas por dia, bloco clicável → editor).

## ✅ Fase 2 — Módulo Sono (feito)
- Card: **deitei / acordei** (botão agora ou hora manual), duração (trata virada da meia-noite), **qualidade 1–5**.
- Vínculos `sono:deitar` / `sono:acordar` nas rotinas dormir/acordar.
- Coluna Sono na Semana + stat no resumo.

## ✅ Fase 3 — Notas (feito)
- Aba **Notas**: bloco geral fixo/persistente (`users/{uid}/meta/notas`), autosave.

## ✅ Fase 4 — Produtividade (feito)
- **Score diário 0–100** (média ponderada de tarefas, água, sono, treino, trabalho) com **pesos ajustáveis** na Config. Card de Produtividade com breakdown por dimensão.
- Semana: coluna Score, **sparkline** de tendência dos 7 dias e média.

## ✅ PWA (feito)
- Instalável na tela inicial (manifest, ícone cérebro neon, service worker offline). `display: standalone`.

---

## Deploy
```bash
cd painel-do-dia
npm run build
npx firebase-tools deploy --only hosting
```
As chaves `NEXT_PUBLIC_FIREBASE_*` são embutidas no build → sempre buildar antes do deploy.
