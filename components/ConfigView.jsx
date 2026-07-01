"use client";
import { useState } from "react";
import { firebaseEnabled } from "@/lib/firebase";

export default function ConfigView({ state, dispatch }) {
  const { cfg } = state;
  const [form, setForm] = useState({
    aguaMeta: cfg.aguaMeta, trabMetaH: cfg.trabMetaH, copo: cfg.copo, garrafa: cfg.garrafa,
    caloriasMeta: cfg.caloriasMeta, pesoMeta: cfg.pesoMeta,
    refeicoes: cfg.refeicoes.join("\n"), tiposTreino: cfg.tiposTreino.join("\n"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    dispatch({
      type: "SET_CFG",
      cfg: {
        ...cfg,
        aguaMeta: parseFloat(form.aguaMeta) || 3,
        trabMetaH: parseFloat(form.trabMetaH) || 8,
        copo: parseFloat(form.copo) || 0.25,
        garrafa: parseFloat(form.garrafa) || 0.5,
        caloriasMeta: parseInt(form.caloriasMeta) || 400,
        pesoMeta: parseFloat(form.pesoMeta) || 75,
        refeicoes: form.refeicoes.split("\n").map((s) => s.trim()).filter(Boolean),
        tiposTreino: form.tiposTreino.split("\n").map((s) => s.trim()).filter(Boolean),
      },
    });
  };

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
      <div className="cfg-actions"><button className="btn" onClick={salvar}>Salvar config</button></div>
      {!firebaseEnabled && (
        <div className="hint">
          <b>Ligar sincronização:</b> copie <code>.env.local.example</code> para <code>.env.local</code> e preencha as chaves do Firebase.<br />
          Sem elas, o app roda em <code>modo local</code> (não persiste ao recarregar).
        </div>
      )}
    </section>
  );
}
