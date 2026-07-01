import { genId, blankDay, ensureIds, DEFAULTS } from "@/lib/model";
import { todayKey } from "@/lib/date";

export const initialState = () => ({
  ready: false,
  mode: "local",
  cfg: { ...DEFAULTS },
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
      return { ...state, ready: true, mode: action.mode, cfg: action.cfg,
        dayKey: action.dayKey, day: ensureIds(action.day), past: [], future: [], timer: { running: false, startedAt: null } };
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
      const d = { ...day, agenda: day.agenda.map((t) => t.id === action.id ? { ...t, done: !t.done } : t) };
      return commit(state, it.done ? "tarefa reaberta" : "tarefa concluída", d);
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

    // ---- agua ----
    case "AGUA": {
      const v = Math.max(0, Math.min(10, +(day.agua + action.delta).toFixed(2)));
      if (v === day.agua) return state;
      return commit(state, action.delta > 0 ? "água +" : "água −", { ...day, agua: v });
    }

    // ---- refeicoes ----
    case "MEAL": {
      const on = !day.refeicoes[action.name];
      return commit(state, on ? "refeição marcada" : "refeição desmarcada",
        { ...day, refeicoes: { ...day.refeicoes, [action.name]: on } });
    }

    // ---- treino ----
    case "TREINO_TOGGLE":
      return commit(state, day.treino.feito ? "treino desmarcado" : "treino marcado",
        { ...day, treino: { ...day.treino, feito: !day.treino.feito } });
    case "TREINO_SET":
      return commit(state, "treino atualizado",
        { ...day, treino: { ...day.treino, [action.field]: action.value } });
    case "TREINO_START":
      return commit(state, "treino iniciado",
        { ...day, treino: { ...day.treino, feito: true, inicio: action.iso, fim: null } });
    case "TREINO_END":
      return commit(state, "treino finalizado",
        { ...day, treino: { ...day.treino, fim: action.iso } });

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
