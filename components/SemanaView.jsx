"use client";
import { useEffect, useState } from "react";
import { keyOf, pad, weekdayDay, todayKey } from "@/lib/date";
import { blankDay, sonoDur } from "@/lib/model";
import { scoreDay, scoreColor } from "@/lib/score";

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
  const scores = keys.map((k) => scoreDay(merged[k] || blankDay(), cfg).score);
  const avgScore = Math.round(scores.reduce((a, s) => a + s, 0) / (scores.length || 1));

  return (
    <section className="card week">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--plan)" }} />Últimos 7 dias</h2>
        <span className="meta">score médio <b style={{ color: scoreColor(avgScore) }}>{avgScore}</b> · {(totalTrab / 3600).toFixed(1)}h trab.</span>
      </div>

      <div className="spark">
        {keys.map((k, i) => (
          <div key={k} className={`spark-col ${k === todayKey() ? "hoje" : ""}`} onClick={() => goToDay(k)}>
            <div className="spark-track"><div className="spark-bar" style={{ height: `${Math.max(scores[i], 3)}%`, background: scoreColor(scores[i]) }} /></div>
            <span className="spark-n">{scores[i]}</span>
            <span className="spark-d">{k === todayKey() ? "hoje" : weekdayDay(k).split(" ")[0]}</span>
          </div>
        ))}
      </div>

      <table>
        <thead>
          <tr><th>Dia</th><th>Score</th><th>Tarefas</th><th>Água</th><th>Sono</th><th>Refeições</th><th>Treino</th><th>Peso</th><th>Trabalho</th></tr>
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
            const sSecs = sonoDur(d.sono?.deitou, d.sono?.acordou);
            const sonoH = sSecs != null ? sSecs / 3600 : null;
            const qual = d.sono?.qualidade || 0;
            const sc = scoreDay(d, cfg).score;
            return (
              <tr key={k}>
                <td className={`dcol ${isHoje ? "hoje" : ""}`} onClick={() => goToDay(k)}><b>{isHoje ? "Hoje" : weekdayDay(k)}</b></td>
                <td><b style={{ color: scoreColor(sc) }}>{sc}</b></td>
                <td>{total ? `${feitas}/${total}` : "—"}</td>
                <td>{(d.agua || 0).toFixed(1)}L<div className="wbar"><i style={{ width: `${aguaPct * 100}%`, background: "var(--agua)" }} /></div></td>
                <td>{sonoH != null ? `${sonoH.toFixed(1)}h` : "—"}{qual ? <div className="qmini">{"★".repeat(qual)}</div> : null}</td>
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
