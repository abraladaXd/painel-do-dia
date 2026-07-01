"use client";
import { useEffect, useState } from "react";
import { keyOf, pad, weekdayDay, todayKey } from "@/lib/date";
import { blankDay } from "@/lib/model";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export default function SemanaView({ state, getRange, goToDay }) {
  const { cfg, day, dayKey } = state;
  const [data, setData] = useState({});

  const keys = (() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); arr.push(keyOf(d)); }
    return arr;
  })();

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await getRange(keys);
      if (alive) setData(r);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const merged = { ...data, [dayKey]: day };
  const totalTrab = keys.reduce((a, k) => a + ((merged[k]?.trabalho?.segundos) || 0), 0);

  return (
    <section className="card week">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--plan)" }} />Últimos 7 dias</h2>
        <span className="meta">{(totalTrab / 3600).toFixed(1)}h trabalhadas</span>
      </div>
      <table>
        <thead>
          <tr><th>Dia</th><th>Tarefas</th><th>Água</th><th>Refeições</th><th>Treino</th><th>Peso</th><th>Trabalho</th></tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const d = merged[k] || blankDay();
            const isHoje = k === todayKey();
            const feitas = (d.agenda || []).filter((x) => x.done).length;
            const total = (d.agenda || []).length;
            const aguaPct = clamp((d.agua || 0) / cfg.aguaMeta, 0, 1);
            const rC = cfg.refeicoes.filter((r) => d.refeicoes && d.refeicoes[r]).length;
            const secs = d.trabalho?.segundos || 0;
            const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
            return (
              <tr key={k}>
                <td className={`dcol ${isHoje ? "hoje" : ""}`} onClick={() => goToDay(k)}><b>{isHoje ? "Hoje" : weekdayDay(k)}</b></td>
                <td>{total ? `${feitas}/${total}` : "—"}</td>
                <td>{(d.agua || 0).toFixed(1)}L<div className="wbar"><i style={{ width: `${aguaPct * 100}%`, background: "var(--agua)" }} /></div></td>
                <td>{rC}/{cfg.refeicoes.length}</td>
                <td>{d.treino?.feito ? <><span className="tick">✓</span> {d.treino.tipo.split("/")[0]}</> : <span className="cross">✕</span>}</td>
                <td>{d.peso != null ? `${d.peso}kg` : "—"}</td>
                <td>{h}:{pad(m)}<div className="wbar"><i style={{ width: `${clamp(secs / (cfg.trabMetaH * 3600), 0, 1) * 100}%`, background: "var(--trab)" }} /></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
