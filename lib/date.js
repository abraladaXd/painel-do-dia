export const pad = (n) => String(n).padStart(2, "0");

export const keyOf = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (k) => {
  const [y, m, dd] = k.split("-").map(Number);
  return new Date(y, m - 1, dd);
};

export const todayKey = () => keyOf(new Date());

// "42:18" abaixo de 1h, senão "2h 05min"
export const fmtDur = (s) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}h ${pad(m)}min` : `${m}:${pad(ss)}`;
};

// "2:45:09" com segundos (relogio de trabalho)
export const fmtHMS = (s) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${pad(m)}:${pad(ss)}`;
};

export const weekdayLong = (d) =>
  d.toLocaleDateString("pt-BR", { weekday: "long" });
export const dayMonth = (d) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
export const shortLabel = (k) =>
  parseKey(k).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
export const weekdayDay = (k) =>
  parseKey(k).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
