"use client";
import { useState, useEffect } from "react";
import { useTracker } from "@/state/useTracker";
import { signInGoogle, signOutUser, preloadAuth } from "@/lib/auth";
import { pad, fmtDur, weekdayLong, dayMonth, shortLabel, keyOf, parseKey, todayKey } from "@/lib/date";
import DiaView from "@/components/DiaView";
import SemanaView from "@/components/SemanaView";
import ConfigView from "@/components/ConfigView";

function Login() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { preloadAuth(); }, []); // deixa o SDK pronto p/ o popup abrir no toque
  const go = async () => {
    setBusy(true); setErr("");
    try { await signInGoogle(); } // no celular redireciona; no desktop abre popup
    catch (e) { setBusy(false); setErr(e?.message || "Não foi possível entrar."); }
  };
  return (
    <div className="login">
      <div className="login-card">
        <div className="eyebrow"><span className="sync on" /><span>painel do dia</span></div>
        <h1 className="title">Painel do dia<span>.</span></h1>
        <p className="login-sub">Entre com o Google para sincronizar suas coisas em qualquer dispositivo.</p>
        <button className="btn google" onClick={go} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.3 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.9-9.7 6.9-17.4z" />
            <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-3.8-13.5-9.1l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {busy ? "abrindo…" : "Entrar com Google"}
        </button>
        {err && <p className="login-err">{err}</p>}
        <p className="login-fine">Cada conta tem seus próprios dados. Você fica conectado neste aparelho.</p>
      </div>
    </div>
  );
}

function UserBar({ user }) {
  return (
    <div className="userbar">
      {user.photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.photo} alt="" className="ub-av" referrerPolicy="no-referrer" />
        : <span className="ub-av ph">{(user.name || user.email || "?").charAt(0).toUpperCase()}</span>}
      <span className="ub-name">{user.name || user.email}</span>
      <button className="ub-out" onClick={() => signOutUser()}>sair</button>
    </div>
  );
}

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

  if (state.needsLogin) return <Login />;
  if (!state.ready) return <div className="boot">carregando painel…</div>;

  const isHoje = state.dayKey === todayKey();
  const stepDay = (delta) => {
    const d = parseKey(state.dayKey); d.setDate(d.getDate() + delta);
    if (delta > 0 && keyOf(d) > todayKey()) return;
    loadDay(keyOf(d));
  };

  return (
    <div className="wrap">
      {state.user && <UserBar user={state.user} />}
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
