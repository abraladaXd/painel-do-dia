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

