"use client";
import { useState } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import { genId } from "@/lib/model";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];        // toggles curtos (0=Dom ... 6=Sáb)
const DIAS_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// ---- quadro semanal de rotinas (colunas por dia; bloco clicável abre editor) ----
function RotinasBoard({ rotinas, setRotinas, refeicoesList }) {
  const [draft, setDraft] = useState(null);
  const todayWd = new Date().getDay();

  const openNew = (wd) => setDraft({ idx: null, id: genId(), time: "07:00", task: "", dias: [wd], link: "" });
  const openEdit = (idx) => setDraft({ idx, ...rotinas[idx], dias: [...rotinas[idx].dias] });
  const close = () => setDraft(null);
  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const toggleDia = (wd) => setDraft((d) => ({
    ...d, dias: d.dias.includes(wd) ? d.dias.filter((x) => x !== wd) : [...d.dias, wd].sort(),
  }));

  const saveDraft = () => {
    const task = (draft.task || "").trim();
    if (!task) { close(); return; }
    const r = { id: draft.id, time: draft.time || "07:00", task, dias: draft.dias.length ? draft.dias : [...ALL_DAYS], link: draft.link || "" };
    setRotinas((rs) => (draft.idx == null ? [...rs, r] : rs.map((x, j) => (j === draft.idx ? r : x))));
    close();
  };
  const delDraft = () => {
    if (draft.idx != null) setRotinas((rs) => rs.filter((_, j) => j !== draft.idx));
    close();
  };

  // rotinas de cada dia, ordenadas por horário (guardando o índice original p/ editar)
  const byDay = ALL_DAYS.map((wd) =>
    rotinas.map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.dias.includes(wd))
      .sort((a, b) => a.r.time.localeCompare(b.r.time))
  );

  return (
    <>
      <div className="rboard-scroll">
        <div className="rboard">
          {ALL_DAYS.map((wd) => (
            <div className="rcol" key={wd}>
              <div className={`rcol-head ${wd === todayWd ? "today" : ""}`}>
                <span>{DIAS_FULL[wd]}</span>
                <button className="rcol-add" title="Nova rotina neste dia" onClick={() => openNew(wd)}>+</button>
              </div>
              {byDay[wd].length === 0 && <div className="rcol-empty">—</div>}
              {byDay[wd].map(({ r, idx }) => (
                <button key={r.id} className={`rblock ${r.link ? "linked" : ""}`} onClick={() => openEdit(idx)}>
                  <span className="bt">{r.time}</span>
                  <span className="bk">{r.task}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {draft && (
        <div className="redit-backdrop" onClick={close}>
          <div className="redit" onClick={(e) => e.stopPropagation()}>
            <h3>{draft.idx == null ? "Nova rotina" : "Editar rotina"}</h3>
            <div className="redit-row">
              <input type="time" value={draft.time} onChange={(e) => patch({ time: e.target.value })} />
              <input type="text" className="txt" autoFocus placeholder="tarefa que se repete" value={draft.task}
                onChange={(e) => patch({ task: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") saveDraft(); if (e.key === "Escape") close(); }} />
            </div>
            <label className="redit-lab">Dias da semana</label>
            <div className="rot-days">
              {DIAS.map((lab, wd) => (
                <button type="button" key={wd} className={draft.dias.includes(wd) ? "on" : ""} onClick={() => toggleDia(wd)}>{lab}</button>
              ))}
            </div>
            <label className="redit-lab">Vincular a um módulo (marcar reflete nos dois)</label>
            <select className="rot-link" value={draft.link || ""} onChange={(e) => patch({ link: e.target.value })}>
              <option value="">sem vínculo</option>
              <option value="treino">↔ Treino</option>
              <option value="sono:deitar">↔ Sono (deitar)</option>
              <option value="sono:acordar">↔ Sono (acordar)</option>
              {refeicoesList.map((m) => <option key={m} value={"refeicao:" + m}>↔ {m}</option>)}
            </select>
            <div className="redit-actions">
              {draft.idx != null ? <button className="btn ghost del" onClick={delDraft}>Excluir</button> : <span />}
              <div className="redit-ok">
                <button className="btn ghost" onClick={close}>Cancelar</button>
                <button className="btn" onClick={saveDraft}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ConfigView({ state, dispatch }) {
  const { cfg } = state;
  const [form, setForm] = useState({
    aguaMeta: cfg.aguaMeta, trabMetaH: cfg.trabMetaH, copo: cfg.copo, garrafa: cfg.garrafa,
    caloriasMeta: cfg.caloriasMeta, pesoMeta: cfg.pesoMeta,
    refeicoes: cfg.refeicoes.join("\n"), tiposTreino: cfg.tiposTreino.join("\n"),
  });
  const [rotinas, setRotinas] = useState(
    (cfg.rotinas || []).map((r) => ({ ...r, dias: [...(r.dias || ALL_DAYS)] }))
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // refeições atuais (do próprio form) p/ oferecer como vínculo
  const refeicoesList = form.refeicoes.split("\n").map((s) => s.trim()).filter(Boolean);

  const buildCfg = () => ({
    ...cfg,
    aguaMeta: parseFloat(form.aguaMeta) || 3,
    trabMetaH: parseFloat(form.trabMetaH) || 8,
    copo: parseFloat(form.copo) || 0.25,
    garrafa: parseFloat(form.garrafa) || 0.5,
    caloriasMeta: parseInt(form.caloriasMeta) || 400,
    pesoMeta: parseFloat(form.pesoMeta) || 75,
    refeicoes: form.refeicoes.split("\n").map((s) => s.trim()).filter(Boolean),
    tiposTreino: form.tiposTreino.split("\n").map((s) => s.trim()).filter(Boolean),
    rotinas: rotinas
      .map((r) => ({ id: r.id, time: r.time || "09:00", task: r.task.trim(), dias: r.dias.length ? r.dias : [...ALL_DAYS], link: r.link || "" }))
      .filter((r) => r.task),
  });

  const salvar = () => dispatch({ type: "SET_CFG", cfg: buildCfg() });
  const salvarEAplicar = () => { dispatch({ type: "SET_CFG", cfg: buildCfg() }); dispatch({ type: "APPLY_ROTINAS" }); };

  return (
    <section className="card">
      <div className="card-head"><h2><span className="dot" style={{ background: "var(--comida)" }} />Metas & preferências</h2></div>
      <div className="cfg-grid">
        <div className="field"><label>Meta de água (L)</label><input type="number" step="0.1" value={form.aguaMeta} onChange={(e) => set("aguaMeta", e.target.value)} /></div>
        <div className="field"><label>Meta de trabalho (h)</label><input type="number" step="0.5" value={form.trabMetaH} onChange={(e) => set("trabMetaH", e.target.value)} /></div>
        <div className="field"><label>Copo (L)</label><input type="number" step="0.05" value={form.copo} onChange={(e) => set("copo", e.target.value)} /></div>
        <div className="field"><label>Garrafa (L)</label><input type="number" step="0.05" value={form.garrafa} onChange={(e) => set("garrafa", e.target.value)} /></div>
        <div className="field"><label>Meta de calorias no treino (kcal)</label><input type="number" value={form.caloriasMeta} onChange={(e) => set("caloriasMeta", e.target.value)} /></div>
        <div className="field"><label>Meta de peso (kg)</label><input type="number" step="0.1" value={form.pesoMeta} onChange={(e) => set("pesoMeta", e.target.value)} /></div>
        <div className="field" style={{ gridColumn: "1/-1" }}><label>Refeições (uma por linha)</label><textarea value={form.refeicoes} onChange={(e) => set("refeicoes", e.target.value)} /></div>
        <div className="field" style={{ gridColumn: "1/-1" }}><label>Tipos de treino (uma por linha)</label><textarea value={form.tiposTreino} onChange={(e) => set("tiposTreino", e.target.value)} /></div>
      </div>

      <div className="rotinas-block">
        <div className="rotinas-head">
          <label>Rotinas — sua semana</label>
          <span className="rotinas-sub">cada dia mostra suas rotinas em ordem de horário · toque num bloco para editar · use + para adicionar</span>
        </div>
        {rotinas.length === 0 && (
          <div className="empty">Nenhuma rotina ainda. Use o + em um dia para adicionar uma tarefa que se repete.</div>
        )}
        <RotinasBoard rotinas={rotinas} setRotinas={setRotinas} refeicoesList={refeicoesList} />
      </div>

      <div className="cfg-actions">
        <button className="btn" onClick={salvar}>Salvar config</button>
        <button className="btn ghost" onClick={salvarEAplicar}>Salvar e aplicar rotinas ao dia atual</button>
      </div>

      {!firebaseEnabled && (
        <div className="hint">
          <b>Ligar sincronização:</b> copie <code>.env.local.example</code> para <code>.env.local</code> e preencha as chaves do Firebase.<br />
          Sem elas, o app roda em <code>modo local</code> (não persiste ao recarregar).
        </div>
      )}
    </section>
  );
}
