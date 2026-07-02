"use client";
import { useState } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import { genId } from "@/lib/model";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"]; // 0=Dom ... 6=Sáb
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

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

  const setRot = (i, patch) => setRotinas((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toggleDia = (i, wd) => setRotinas((rs) => rs.map((r, j) => {
    if (j !== i) return r;
    const dias = r.dias.includes(wd) ? r.dias.filter((d) => d !== wd) : [...r.dias, wd].sort();
    return { ...r, dias };
  }));
  const addRot = () => setRotinas((rs) => [...rs, { id: genId(), time: "09:00", task: "", dias: [...ALL_DAYS], link: "" }]);
  const delRot = (i) => setRotinas((rs) => rs.filter((_, j) => j !== i));

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
          <label>Rotinas — tarefas que se repetem</label>
          <span className="rotinas-sub">aparecem sozinhas em cada novo dia, nos dias marcados</span>
        </div>
        <div className="rotinas">
          {rotinas.length === 0 && <div className="empty">Nenhuma rotina. Adicione tarefas que se repetem (ex.: “Tomar remédio 08:00”).</div>}
          {rotinas.map((r, i) => (
            <div className="rot-row" key={r.id}>
              <input type="time" value={r.time} onChange={(e) => setRot(i, { time: e.target.value })} />
              <input type="text" className="txt" placeholder="tarefa que se repete" value={r.task} onChange={(e) => setRot(i, { task: e.target.value })} />
              <button className="mini" title="Remover rotina" onClick={() => delRot(i)}>✕</button>
              <div className="rot-controls">
                <div className="rot-days">
                  {DIAS.map((lab, wd) => (
                    <button type="button" key={wd} className={r.dias.includes(wd) ? "on" : ""} onClick={() => toggleDia(i, wd)}>{lab}</button>
                  ))}
                </div>
                <select className="rot-link" title="Vincular a um módulo" value={r.link || ""} onChange={(e) => setRot(i, { link: e.target.value })}>
                  <option value="">sem vínculo</option>
                  <option value="treino">↔ Treino</option>
                  {refeicoesList.map((m) => <option key={m} value={"refeicao:" + m}>↔ {m}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button className="btn ghost" onClick={addRot}>+ rotina</button>
        </div>
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
