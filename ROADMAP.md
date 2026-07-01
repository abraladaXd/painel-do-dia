# Roadmap — Painel do Dia (sistema integrado)

> **Princípio:** não são widgets soltos. Tarefas/rotinas são **eventos ligados às dimensões do dia** — marcar num lugar reflete nos outros. O objetivo é um painel completo que ajude de verdade (sono, produtividade, notas), não superficial.

App: Next.js 14 (export estático) · Firebase Hosting `megabrain-51939` → https://megabrain-51939.web.app · dados por usuário no Firestore.

---

## ✅ Fase 0 — Base (feito)
- Hosting no Firebase (export estático `out/` + `firebase.json` + `.firebaserc`).
- Responsividade: viewport meta, safe-area, tabela da Semana com scroll no mobile.
- Layout **masonry unificado** (`.cards`) — acaba com o espaço vazio.
- **Rotinas**: tarefas repetidas por horário + dias da semana (aba Config), semeadas em cada novo dia, marcador ↻.

## 🔨 Fase 1 — Integração rotina↔módulos (EM ANDAMENTO)
Cada rotina/tarefa ganha um **vínculo** (`link`) com um módulo. Sincronização **bidirecional**:
- `treino` → marcar a tarefa liga o card de Treino; ligar o treino marca a tarefa.
- `refeicao:<nome>` → marca/desmarca a refeição correspondente.
- (`sono`, `trabalho` entram nas fases seguintes.)
- Config: seletor de vínculo por rotina.
- Arquivos: `lib/model.js` (seedAgenda copia link), `state/reducer.js` (TOGGLE_TASK/TREINO_*/MEAL sincronizam), `components/ConfigView.jsx` (seletor).

## 🌙 Fase 2 — Módulo Sono
- Card dedicado: botões **deitei / acordei** (timestamps), duração calculada, **nota de qualidade 1–5**.
- Vínculo `sono` nas rotinas dormir/acordar (pré-preenche os horários).
- Média de horas + tendência de qualidade na aba Semana.

## 📝 Fase 3 — Notas
- **Um bloco de notas geral, fixo/persistente** (não por dia): `users/{uid}/meta/notas`.
- Texto livre, salva com debounce, sempre acessível.

## 📊 Fase 4 — Produtividade
- **Score diário 0–100** combinando: tarefas feitas, treino, % de água, sono, horas trabalhadas — com **pesos ajustáveis** na Config.
- Aba **Semana vira análise**: evolução do score, médias e correlações simples (ex.: "dormiu mais → treinou mais").

---

## Deploy
```bash
cd painel-do-dia
npm run build
npx firebase-tools deploy --only hosting
```
As chaves `NEXT_PUBLIC_FIREBASE_*` são embutidas no build → sempre buildar antes do deploy.
