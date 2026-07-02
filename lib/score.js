import { sonoDur } from "@/lib/model";

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export const SCORE_PARTS = [
  { key: "tarefas", label: "Tarefas" },
  { key: "agua", label: "Água" },
  { key: "sono", label: "Sono" },
  { key: "treino", label: "Treino" },
  { key: "trabalho", label: "Trabalho" },
];

// score de produtividade do dia: média ponderada das dimensões com dados (0-100)
export function scoreDay(day, cfg) {
  const pesos = cfg.pesos || {};
  const w = (k) => { const v = pesos[k]; return v == null ? 1 : v; };

  const raw = {
    tarefas: (() => {
      const total = (day.agenda || []).length;
      if (!total) return null; // dia sem tarefas não pesa
      return (day.agenda || []).filter((t) => t.done).length / total;
    })(),
    agua: cfg.aguaMeta ? (day.agua || 0) / cfg.aguaMeta : null,
    sono: (() => {
      const s = sonoDur(day.sono?.deitou, day.sono?.acordou);
      return s != null && cfg.sonoMeta ? (s / 3600) / cfg.sonoMeta : null;
    })(),
    treino: day.treino?.feito ? 1 : 0,
    trabalho: cfg.trabMetaH ? (day.trabalho?.segundos || 0) / 3600 / cfg.trabMetaH : null,
  };

  const parts = SCORE_PARTS.map(({ key, label }) => {
    const v = raw[key];
    const weight = w(key);
    const included = v != null && weight > 0;
    return { key, label, value: v == null ? null : clamp01(v), weight, included };
  });

  const inc = parts.filter((p) => p.included);
  const wsum = inc.reduce((a, p) => a + p.weight, 0);
  const score = wsum > 0 ? Math.round((inc.reduce((a, p) => a + p.weight * p.value, 0) / wsum) * 100) : 0;
  return { score, parts };
}

export function scoreColor(score) {
  if (score >= 70) return "var(--treino)";
  if (score >= 40) return "var(--comida)";
  return "var(--erase)";
}
