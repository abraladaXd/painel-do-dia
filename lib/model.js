import { parseKey } from "@/lib/date";

export const DEFAULTS = {
  aguaMeta: 3.0,
  trabMetaH: 8,
  copo: 0.25,
  garrafa: 0.5,
  refeicoes: ["Café", "Almoço", "Lanche", "Janta"],
  caloriasMeta: 400,
  pesoMeta: 75,
  ultimoPeso: null,
  tiposTreino: ["Peito/Tríceps", "Costas/Bíceps", "Perna", "Ombro", "Full body", "Cardio"],
  // rotinas = tarefas que se repetem. dias: [0..6] (0=Dom ... 6=Sáb)
  rotinas: [],
};

// gera a agenda de um dia a partir das rotinas que caem naquele dia da semana
export const seedAgenda = (dateKey, rotinas = []) => {
  const wd = parseKey(dateKey).getDay();
  return (rotinas || [])
    .filter((r) => Array.isArray(r.dias) && r.dias.includes(wd))
    .map((r) => ({ id: genId(), rid: r.id, time: r.time, task: r.task, done: false, link: r.link || "" }))
    .sort((a, b) => a.time.localeCompare(b.time));
};

export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const blankDay = () => ({
  agenda: [],
  agua: 0,
  refeicoes: {},
  treino: { feito: false, tipo: "Peito/Tríceps", inicio: null, fim: null, calorias: 0 },
  trabalho: { segundos: 0 },
  peso: null,
});

export const ensureIds = (d) => {
  (d.agenda || []).forEach((t) => { if (!t.id) t.id = genId(); });
  return d;
};

export const SEED = [];

