"use client";
import { useState, useEffect } from "react";
import { useTracker } from "@/state/useTracker";
import { pad, fmtDur, weekdayLong, dayMonth, shortLabel, keyOf, parseKey, todayKey } from "@/lib/date";
import DiaView from "@/components/DiaView";
import SemanaView from "@/components/SemanaView";
import ConfigView from "@/components/ConfigView";

function Header({ state, now }) {
  const d = new Date(now);
  const nowS = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return (
    <header>
      <div>
        <div className="eyebrow">
          <span className={`sync ${state.mode === "firebase" ? "on" : ""}`} />
          <span>{state.mode === "firebase" ? "sincronizado" : "modo local"}</span>
        </div>
        <div className="dateline">
          <span className="wd">{weekdayLong(d)}</span>
          <span className="dm">{dayMonth(d)}</span>
        </div>
        <h1 className="title">Painel do dia<span>.</span></h1>
      </div>
      <div className="clock">
        <div className="time">{pad(d.getHours())}:{pad(d.getMinutes())}<em>{pad(d.getSeconds())}</em></div>
        <div className="remain">restam <b>{fmtDur(86400 - nowS)}</b> do dia</div>
        <div className="dayline"><i style={{ width: `${(nowS / 86400) * 100}%` }} /></div>
      </div>
    </header>
  );
}

function Focus({ state, now }) {
  if (state.dayKey !== todayKey()) return null;
  const d = new Date(now);
  const nowS = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const pend = state.day.agenda
    .filter((s) => !s.done)
    .map((s) => { const [h, m] = s.time.split(":").map(Number); return { task: s.task, secs: h * 3600 + m * 60 }; })
    .sort((a, b) => a.secs - b.secs);
  const late = pend.filter((s) => s.secs <= nowS);
  const next = pend.find((s) => s.secs > nowS);

  let cls = "", k = "Foco agora", task = "", count = "";
  if (late.length) { cls = "late"; k = "Atrasado"; task = late[0].task; count = "há " + fmtDur(nowS - late[0].secs); }
  else if (next) { task = next.task; count = "em " + fmtDur(next.secs - nowS); }
  else { cls = "calm"; k = state.day.agenda.length ? "Tudo feito" : "Dia livre"; task = state.day.agenda.length ? "Nenhuma pendência — segue o fluxo." : "Sem compromissos hoje. Planejar algo?"; }

  return (
    <div className={`focus ${cls}`}>
      <div className="focus-spine" />
      <div className="focus-main"><div className="focus-k">{k}</div><div className="focus-task">{task}</div></div>
      {count && <div className="focus-count">{count}</div>}
    </div>
  );
}

function Toast({ toast, dispatch }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = setTimeout(() => setShown(null), 4500);
    return () => clearTimeout(t);
  }, [toast?.seq]);
  return (
    <div className={`toast ${shown ? "show" : ""}`}>
      <span className="t-msg">{shown?.msg}</span>
      {shown?.undoable && <button className="t-undo" onClick={() => dispatch({ type: "UNDO" })}>Desfazer</button>}
    </div>
  );
}

export default function Page() {
  const { state, dispatch, now, liveSeconds, loadDay, getRange } = useTracker();
  const [tab, setTab] = useState("hoje");

  if (!state.ready) return <div className="boot">carregando painel…</div>;

  const isHoje = state.dayKey === todayKey();
  const stepDay = (delta) => {
    const d = parseKey(state.dayKey); d.setDate(d.getDate() + delta);
    if (delta > 0 && keyOf(d) > todayKey()) return;
    loadDay(keyOf(d));
  };

  return (
    <div className="wrap">
      <Header state={state} now={now} />

      <div className="bar">
        <div className="tabs">
          <button className={tab === "hoje" ? "on" : ""} onClick={() => setTab("hoje")}>Dia</button>
          <button className={tab === "semana" ? "on" : ""} onClick={() => setTab("semana")}>Semana</button>
          <button className={tab === "config" ? "on" : ""} onClick={() => setTab("config")}>Config</button>
        </div>
        {tab === "hoje" && (
          <div className="datenav">
            <button onClick={() => stepDay(-1)}>‹</button>
            <div className={`lbl ${isHoje ? "hoje" : ""}`}><b>{isHoje ? "Hoje" : shortLabel(state.dayKey)}</b></div>
            <button onClick={() => stepDay(1)} disabled={isHoje}>›</button>
          </div>
        )}
      </div>

      {tab === "hoje" && <><Focus state={state} now={now} /><DiaView state={state} dispatch={dispatch} now={now} liveSeconds={liveSeconds} /></>}
      {tab === "semana" && <SemanaView state={state} getRange={getRange} goToDay={(k) => { setTab("hoje"); loadDay(k); }} />}
      {tab === "config" && <ConfigView state={state} dispatch={dispatch} />}

      <div className="foot">{state.mode === "firebase" ? "sincronizado no Firestore" : "modo local — configure o Firebase para persistir"}</div>
      <Toast toast={state.toast} dispatch={dispatch} />
    </div>
  );
}
