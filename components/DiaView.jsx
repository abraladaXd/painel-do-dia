"use client";
import { useState, useRef } from "react";
import { pad, fmtHMS, todayKey } from "@/lib/date";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = (s) => s;

function Agenda({ state, dispatch }) {
  const { day, editing } = state;
  const [time, setTime] = useState("09:00");
  const [task, setTask] = useState("");
  const edTime = useRef(null);
  const edTask = useRef(null);

  const sorted = [...day.agenda].sort((a, b) => a.time.localeCompare(b.time));
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = state.dayKey === todayKey();
  const nextId = (() => {
    if (!isToday) return null;
    const cand = sorted.find((s) => !s.done && (s.time.split(":")[0] * 60 + +s.time.split(":")[1]) >= nowM);
    return cand ? cand.id : null;
  })();
  const feitas = day.agenda.filter((s) => s.done).length;

  const add = () => { if (task.trim()) { dispatch({ type: "ADD_TASK", time, task }); setTask(""); } };
  const save = (id) => dispatch({ type: "EDIT_TASK", id, time: edTime.current.value, task: edTask.current.value });

  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--plan)" }} />Obrigações</h2>
        <span className="meta">{feitas}/{day.agenda.length}</span>
      </div>
      <div>
        {sorted.length === 0 && <div className="empty">Nenhuma obrigação neste dia.</div>}
        {sorted.map((s) =>
          s.id === editing ? (
            <div className="slot editing" key={s.id}>
              <input type="time" defaultValue={s.time} ref={edTime}
                onKeyDown={(e) => { if (e.key === "Enter") save(s.id); if (e.key === "Escape") dispatch({ type: "SET_EDITING", id: null }); }} />
              <input type="text" className="ed-task" defaultValue={s.task} ref={edTask} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") save(s.id); if (e.key === "Escape") dispatch({ type: "SET_EDITING", id: null }); }} />
              <div className="ed-actions">
                <button className="mini ok" onClick={() => save(s.id)}>✓</button>
                <button className="mini" onClick={() => dispatch({ type: "SET_EDITING", id: null })}>✕</button>
              </div>
            </div>
          ) : (
            <div className={`slot ${s.done ? "done" : ""} ${s.id === nextId ? "now" : ""}`} key={s.id}>
              <div className="t">{s.time}</div>
              <div className="task" onClick={() => dispatch({ type: "TOGGLE_TASK", id: s.id })}>
                <span className="box" /><span>{s.rid && <i className="rec" title="rotina">↻</i>}{esc(s.task)}</span>
              </div>
              <div className="row-actions">
                <button className="rm edit" title="Editar" onClick={() => dispatch({ type: "SET_EDITING", id: s.id })}>✎</button>
                <button className="rm" title="Remover" onClick={() => dispatch({ type: "DEL_TASK", id: s.id })}>✕</button>
              </div>
            </div>
          )
        )}
      </div>
      <div className="add-row">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input type="text" className="txt" placeholder="O que precisa ser feito?" value={task}
          onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </section>
  );
}

function Agua({ state, dispatch }) {
  const { day, cfg } = state;
  const pct = clamp(day.agua / cfg.aguaMeta, 0, 1);
  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--agua)" }} />Água</h2>
        <span className="meta">{Math.round(pct * 100)}%</span>
      </div>
      <div className="agua-body">
        <div className="gauge">
          <div className="marks">{[25, 50, 75].map((p) => <span key={p} style={{ bottom: `${p}%` }} />)}</div>
          <i style={{ height: `${pct * 100}%` }} />
        </div>
        <div className="agua-ctrl">
          <div className="agua-read"><b>{+day.agua.toFixed(2)}</b><small>/ {cfg.aguaMeta.toFixed(1)} L</small></div>
          <div className="step">
            <button onClick={() => dispatch({ type: "AGUA", delta: -cfg.copo })}>−</button>
            <button onClick={() => dispatch({ type: "AGUA", delta: cfg.copo })}>+ copo</button>
            <button onClick={() => dispatch({ type: "AGUA", delta: cfg.garrafa })}>+ garrafa</button>
          </div>
          <div className="mini-meta"><span>{Math.round(day.agua / cfg.copo)} copos</span><span>meta {cfg.aguaMeta.toFixed(1)} L</span></div>
        </div>
      </div>
    </section>
  );
}

function Alimentacao({ state, dispatch }) {
  const { day, cfg } = state;
  const rC = cfg.refeicoes.filter((r) => day.refeicoes[r]).length;
  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--comida)" }} />Alimentação</h2>
        <span className="meta">{rC}/{cfg.refeicoes.length}</span>
      </div>
      <div className="meals">
        {cfg.refeicoes.map((r) => (
          <div key={r} className={`chip ${day.refeicoes[r] ? "on" : ""}`} onClick={() => dispatch({ type: "MEAL", name: r })}>
            <span className="c" />{r}
          </div>
        ))}
      </div>
    </section>
  );
}

function Treino({ state, dispatch, now }) {
  const { day, cfg } = state;
  const t = day.treino;
  const [cal, setCal] = useState("");
  const inicio = t.inicio ? new Date(t.inicio) : null;
  const fim = t.fim ? new Date(t.fim) : null;
  const emAndamento = inicio && !fim;
  const durSecs = inicio ? ((fim ? fim.getTime() : now) - inicio.getTime()) / 1000 : 0;
  const durTxt = inicio ? `${Math.floor(durSecs / 60)}min` : "—";
  const calPct = clamp((t.calorias || 0) / (cfg.caloriasMeta || 1), 0, 1);
  const hm = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "—");

  const addCal = () => { const v = parseInt(cal); if (!isNaN(v)) { dispatch({ type: "TREINO_SET", field: "calorias", value: (t.calorias || 0) + v }); setCal(""); } };

  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--treino)" }} />Treino</h2>
        <span className="meta">{t.feito ? t.tipo : "pendente"}</span>
      </div>
      <div className="treino-top">
        <div className={`toggle ${t.feito ? "on" : ""}`} onClick={() => dispatch({ type: "TREINO_TOGGLE" })}><i /></div>
        <select value={t.tipo} onChange={(e) => dispatch({ type: "TREINO_SET", field: "tipo", value: e.target.value })}>
          {cfg.tiposTreino.map((tp) => <option key={tp}>{tp}</option>)}
        </select>
      </div>
      <div className="treino-sess">
        <div className="sess-box"><div className="lab">Início</div><div className="val">{hm(inicio)}</div></div>
        <div className="sess-box"><div className="lab">Fim</div><div className="val">{hm(fim)}</div></div>
        <div className="sess-box"><div className="lab">Duração</div><div className="val dur">{durTxt}</div></div>
      </div>
      <div className="treino-btns">
        {!emAndamento ? (
          <button className="btn" onClick={() => dispatch({ type: "TREINO_START", iso: new Date().toISOString() })}>
            {t.inicio ? "Reiniciar treino" : "Iniciar treino"}
          </button>
        ) : (
          <button className="btn stop" onClick={() => dispatch({ type: "TREINO_END", iso: new Date().toISOString() })}>Finalizar treino</button>
        )}
      </div>
      <div className="cal-block">
        <div className="cal-head">
          <span className="now">{t.calorias || 0} <span style={{ fontSize: 13, color: "var(--muted)" }}>kcal</span></span>
          <span className="goal">meta {cfg.caloriasMeta} kcal</span>
        </div>
        <div className="cal-bar"><i style={{ width: `${calPct * 100}%` }} /></div>
        <div className="cal-input">
          <input type="number" placeholder="kcal queimadas" value={cal} onChange={(e) => setCal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCal(); }} />
          <button className="btn ghost" onClick={addCal}>Somar</button>
        </div>
      </div>
    </section>
  );
}

function Peso({ state, dispatch }) {
  const { day, cfg } = state;
  const [val, setVal] = useState("");
  const atual = day.peso ?? cfg.ultimoPeso;
  const meta = cfg.pesoMeta;
  // progresso: 0% no ultimo peso conhecido "de partida", 100% na meta — aqui mostramos distancia ate a meta
  const diff = atual != null ? +(atual - meta).toFixed(1) : null;
  const save = () => { if (val !== "") { dispatch({ type: "PESO", value: val }); setVal(""); } };
  const pct = atual != null && meta ? clamp(1 - Math.abs(atual - meta) / Math.max(meta * 0.25, 1), 0, 1) : 0;

  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--peso)" }} />Peso</h2>
        <span className="meta">{day.peso != null ? "registrado hoje" : "—"}</span>
      </div>
      <div className="peso-body">
        <div className="peso-now"><b>{atual != null ? atual : "—"}</b><small> kg</small></div>
        <div className="peso-input">
          <input type="number" step="0.1" placeholder="peso hoje" value={val} onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          <button className="btn" style={{ background: "var(--peso)" }} onClick={save}>Registrar</button>
        </div>
        <div className="peso-goal">
          <span>meta <b>{meta} kg</b></span>
          <span>{diff != null ? (diff > 0 ? `faltam ${Math.abs(diff)} kg` : diff < 0 ? `${Math.abs(diff)} kg abaixo` : "na meta") : "sem registro"}</span>
        </div>
        <div className="peso-bar"><i style={{ width: `${pct * 100}%` }} /></div>
      </div>
    </section>
  );
}

function Trabalho({ state, dispatch, liveSeconds }) {
  const { day, cfg, timer, trabEditing } = state;
  const h = useRef(null);
  const m = useRef(null);
  const metaS = cfg.trabMetaH * 3600;

  const openEdit = () => {
    dispatch({ type: "SET_TRAB_EDITING", value: true });
    setTimeout(() => {
      if (h.current) h.current.value = Math.floor(day.trabalho.segundos / 3600);
      if (m.current) m.current.value = Math.floor((day.trabalho.segundos % 3600) / 60);
      h.current?.focus();
    }, 0);
  };
  const saveEdit = () => {
    const hh = parseInt(h.current?.value) || 0;
    const mm = clamp(parseInt(m.current?.value) || 0, 0, 59);
    dispatch({ type: "TRAB_SET", secs: hh * 3600 + mm * 60 });
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--trab)" }} />Horas trabalhadas</h2>
        <span className="meta">{(liveSeconds / 3600).toFixed(1)}h / {cfg.trabMetaH}h</span>
      </div>
      {trabEditing ? (
        <div className="trab-edit">
          <input type="number" min="0" ref={h} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") dispatch({ type: "SET_TRAB_EDITING", value: false }); }} />
          <span>:</span>
          <input type="number" min="0" max="59" ref={m} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") dispatch({ type: "SET_TRAB_EDITING", value: false }); }} />
          <button className="btn" onClick={saveEdit}>ok</button>
        </div>
      ) : (
        <div className="trab-read" title="Clique para digitar" onClick={openEdit}>{fmtHMS(liveSeconds)}</div>
      )}
      <div className="trab-bar"><i style={{ width: `${clamp(liveSeconds / metaS, 0, 1) * 100}%` }} /></div>
      <div className="trab-ctrl">
        <button className={`btn ${timer.running ? "stop" : ""}`} onClick={() => dispatch({ type: timer.running ? "TIMER_PAUSE" : "TIMER_START" })}>
          {timer.running ? "Pausar" : "Iniciar"}
        </button>
        <button className="btn ghost" onClick={() => dispatch({ type: "TRAB_DELTA", secs: -1800 })}>−30</button>
        <button className="btn warn" onClick={() => dispatch({ type: "TRAB_DELTA", secs: 1800 })}>+30</button>
      </div>
    </section>
  );
}

export default function DiaView({ state, dispatch, now, liveSeconds }) {
  const { day, cfg } = state;
  const feitas = day.agenda.filter((s) => s.done).length;
  const rC = cfg.refeicoes.filter((r) => day.refeicoes[r]).length;
  const h = Math.floor(liveSeconds / 3600), m = Math.floor((liveSeconds % 3600) / 60);

  return (
    <div>
      <div className="cards">
        <Agenda state={state} dispatch={dispatch} />
        <Agua state={state} dispatch={dispatch} />
        <Alimentacao state={state} dispatch={dispatch} />
        <Treino state={state} dispatch={dispatch} now={now} />
        <Peso state={state} dispatch={dispatch} />
        <Trabalho state={state} dispatch={dispatch} liveSeconds={liveSeconds} />
      </div>
      <div className="resumo">
        <div className="stat"><div className="k">Tarefas</div><div className="v">{feitas}<small>/{day.agenda.length}</small></div></div>
        <div className="stat"><div className="k">Água</div><div className="v">{day.agua.toFixed(1)}<small>L</small></div></div>
        <div className="stat"><div className="k">Treino</div><div className="v">{day.treino.calorias || 0}<small>kcal</small></div></div>
        <div className="stat"><div className="k">Peso</div><div className="v">{(day.peso ?? cfg.ultimoPeso) ?? "—"}<small>kg</small></div></div>
        <div className="stat"><div className="k">Trabalho</div><div className="v">{h}:{pad(m)}</div></div>
      </div>
    </div>
  );
}
