import { genId, blankDay, ensureIds, DEFAULTS } from "@/lib/model";
import { todayKey, parseKey } from "@/lib/date";

export const initialState = () => ({
  ready: false,
  needsLogin: false,   // true = mostrar tela de login (Firebase ligado, sem sessao)
  user: null,          // { uid, name, email, photo } quando logado
  mode: "local",
  cfg: { ...DEFAULTS },
  notas: "",           // bloco de notas geral (fixo, fora do dia)
  dayKey: todayKey(),
  day: blankDay(),
  timer: { running: false, startedAt: null },
  past: [],
  future: [],
  editing: null,       // id da tarefa em edicao
  trabEditing: false,  // editor manual de horas
  toast: null,         // { msg, seq, undoable }
});

let seq = 0;
const toast = (msg, undoable = false) => ({ msg, seq: ++seq, undoable });

// --- integração rotina↔módulos ---
// marcar/desmarcar uma tarefa vinculada reflete no módulo correspondente
function applyTaskLink(day, link, on) {
  if (!link) return day;
  if (link === "treino") return { ...day, treino: { ...day.treino, feito: on } };
  if (link.startsWith("refeicao:")) {
    const name = link.slice("refeicao:".length);
    return { ...day, refeicoes: { ...day.refeicoes, [name]: on } };
  }
  const sono = day.sono || { deitou: null, acordou: null, qualidade: 0 };
  if (link === "sono:deitar") return { ...day, sono: { ...sono, deitou: on ? new Date().toISOString() : null } };
  if (link === "sono:acordar") return { ...day, sono: { ...sono, acordou: on ? new Date().toISOString() : null } };
  return day;
}
// mexer no módulo reflete de volta nas tarefas vinculadas a ele
function markLinkedTasks(day, link, done) {
  let changed = false;
  const agenda = day.agenda.map((t) => {
    if (t.link === link && t.done !== done) { changed = true; return { ...t, done }; }
    return t;
  });
  return changed ? { ...day, agenda } : day;
}

// aplica uma mudanca no `day` empurrando o estado anterior pro historico
function commit(state, label, day) {
  return {
    ...state,
    day,
    past: [...state.past, { label, snap: state.day }].slice(-100),
    future: [],
    toast: toast(label, true),
  };
}

export function reducer(state, action) {
  const { day, cfg } = state;
  switch (action.type) {
    // ---- ciclo de vida ----
    case "INIT":
      return { ...state, ready: true, needsLogin: false, user: action.user || null, mode: action.mode, cfg: action.cfg,
        notas: action.notas || "", dayKey: action.dayKey, day: ensureIds(action.day), past: [], future: [], timer: { running: false, startedAt: null } };
    case "NEEDS_LOGIN":
      return { ...state, ready: false, needsLogin: true, user: null };
    case "SET_NOTAS":
      return { ...state, notas: action.value };
    case "LOAD_DAY":
      return { ...state, dayKey: action.dayKey, day: ensureIds(action.day),
        past: [], future: [], timer: { running: false, startedAt: null }, editing: null, trabEditing: false };
    case "SET_CFG":
      return { ...state, cfg: action.cfg, toast: toast("config salva") };

    // ---- agenda ----
    case "ADD_TASK": {
      if (!action.task.trim()) return state;
      const d = { ...day, agenda: [...day.agenda, { id: genId(), time: action.time, task: action.task.trim(), done: false }] };
      return commit(state, "tarefa adicionada", d);
    }
    case "TOGGLE_TASK": {
      const it = day.agenda.find((t) => t.id === action.id);
      if (!it) return state;
      const on = !it.done;
      let d = { ...day, agenda: day.agenda.map((t) => t.id === action.id ? { ...t, done: on } : t) };
      d = applyTaskLink(d, it.link, on); // reflete no módulo vinculado (treino/refeição)
      return commit(state, on ? "tarefa concluída" : "tarefa reaberta", d);
    }
    case "EDIT_TASK": {
      if (!action.task.trim()) return { ...state, editing: null };
      const d = { ...day, agenda: day.agenda.map((t) => t.id === action.id ? { ...t, time: action.time, task: action.task.trim() } : t) };
      return { ...commit(state, "tarefa editada", d), editing: null };
    }
    case "DEL_TASK": {
      const d = { ...day, agenda: day.agenda.filter((t) => t.id !== action.id) };
      return commit(state, "tarefa removida", d);
    }
    case "SET_EDITING":
      return { ...state, editing: action.id };
    case "APPLY_ROTINAS": {
      const wd = parseKey(state.dayKey).getDay();
      const have = new Set(day.agenda.map((t) => t.rid).filter(Boolean));
      const toAdd = (cfg.rotinas || [])
        .filter((r) => Array.isArray(r.dias) && r.dias.includes(wd) && !have.has(r.id))
        .map((r) => ({ id: genId(), rid: r.id, time: r.time, task: r.task, done: false, link: r.link || "" }));
      if (!toAdd.length) return { ...state, toast: toast("Rotinas já aplicadas") };
      return commit(state, `${toAdd.length} rotina(s) adicionada(s)`, { ...day, agenda: [...day.agenda, ...toAdd] });
    }

    // ---- agua ----
    case "AGUA": {
      const v = Math.max(0, Math.min(10, +(day.agua + action.delta).toFixed(2)));
      if (v === day.agua) return state;
      return commit(state, action.delta > 0 ? "água +" : "água −", { ...day, agua: v });
    }

    // ---- refeicoes ----
    case "MEAL": {
      const on = !day.refeicoes[action.name];
      let d = { ...day, refeicoes: { ...day.refeicoes, [action.name]: on } };
      d = markLinkedTasks(d, "refeicao:" + action.name, on); // reflete na tarefa vinculada
      return commit(state, on ? "refeição marcada" : "refeição desmarcada", d);
    }

    // ---- treino ----
    case "TREINO_TOGGLE": {
      const feito = !day.treino.feito;
      let d = { ...day, treino: { ...day.treino, feito } };
      d = markLinkedTasks(d, "treino", feito); // reflete nas tarefas de treino
      return commit(state, feito ? "treino marcado" : "treino desmarcado", d);
    }
    case "TREINO_SET":
      return commit(state, "treino atualizado",
        { ...day, treino: { ...day.treino, [action.field]: action.value } });
    case "TREINO_START": {
      let d = { ...day, treino: { ...day.treino, feito: true, inicio: action.iso, fim: null } };
      d = markLinkedTasks(d, "treino", true);
      return commit(state, "treino iniciado", d);
    }
    case "TREINO_END":
      return commit(state, "treino finalizado",
        { ...day, treino: { ...day.treino, fim: action.iso } });

    // ---- sono ----
    case "SONO_DEITAR": {
      const sono = day.sono || { deitou: null, acordou: null, qualidade: 0 };
      let d = { ...day, sono: { ...sono, deitou: action.iso } };
      d = markLinkedTasks(d, "sono:deitar", true);
      return commit(state, "sono: deitou", d);
    }
    case "SONO_ACORDAR": {
      const sono = day.sono || { deitou: null, acordou: null, qualidade: 0 };
      let d = { ...day, sono: { ...sono, acordou: action.iso } };
      d = markLinkedTasks(d, "sono:acordar", true);
      return commit(state, "sono: acordou", d);
    }
    case "SONO_SET_TIME": {
      const sono = day.sono || { deitou: null, acordou: null, qualidade: 0 };
      return commit(state, "sono ajustado", { ...day, sono: { ...sono, [action.field]: action.iso } });
    }
    case "SONO_QUAL": {
      const sono = day.sono || { deitou: null, acordou: null, qualidade: 0 };
      return commit(state, "qualidade do sono", { ...day, sono: { ...sono, qualidade: action.value } });
    }

    // ---- peso ----
    case "PESO": {
      const p = action.value === "" ? null : +action.value;
      return {
        ...commit(state, "peso registrado", { ...day, peso: p }),
        cfg: p != null ? { ...cfg, ultimoPeso: p } : cfg,
      };
    }

    // ---- trabalho (timer nao entra no undo; ajustes sim) ----
    case "TIMER_START":
      return { ...state, timer: { running: true, startedAt: Date.now() } };
    case "TIMER_PAUSE": {
      if (!state.timer.running) return state;
      const el = (Date.now() - state.timer.startedAt) / 1000;
      return { ...state, timer: { running: false, startedAt: null },
        day: { ...day, trabalho: { segundos: day.trabalho.segundos + el } } };
    }
    case "COMMIT_TIMER": {
      if (!state.timer.running) return state;
      const el = (Date.now() - state.timer.startedAt) / 1000;
      return { ...state, timer: { running: true, startedAt: Date.now() },
        day: { ...day, trabalho: { segundos: day.trabalho.segundos + el } } };
    }
    case "TRAB_DELTA": {
      // pausa/commita o timer antes de ajustar manualmente
      let base = day.trabalho.segundos, timer = state.timer;
      if (timer.running) { base += (Date.now() - timer.startedAt) / 1000; timer = { running: false, startedAt: null }; }
      const secs = Math.max(0, Math.min(86400, base + action.secs));
      return { ...commit({ ...state, timer }, action.secs > 0 ? "+30 min" : "−30 min",
        { ...day, trabalho: { segundos: secs } }) };
    }
    case "TRAB_SET": {
      let timer = state.timer;
      if (timer.running) timer = { running: false, startedAt: null };
      const secs = Math.max(0, Math.min(86400, action.secs));
      return { ...commit({ ...state, timer }, "tempo ajustado", { ...day, trabalho: { segundos: secs } }), trabEditing: false };
    }
    case "SET_TRAB_EDITING":
      return { ...state, trabEditing: action.value };

    // ---- undo / redo ----
    case "UNDO": {
      if (!state.past.length) return { ...state, toast: toast("Nada pra desfazer") };
      const prev = state.past[state.past.length - 1];
      return { ...state, day: prev.snap, past: state.past.slice(0, -1),
        future: [...state.future, { label: prev.label, snap: state.day }],
        toast: toast("Desfeito: " + prev.label, true) };
    }
    case "REDO": {
      if (!state.future.length) return { ...state, toast: toast("Nada pra refazer") };
      const nxt = state.future[state.future.length - 1];
      return { ...state, day: nxt.snap, future: state.future.slice(0, -1),
        past: [...state.past, { label: nxt.label, snap: state.day }],
        toast: toast("Refeito", true) };
    }

    default:
      return state;
  }
}
