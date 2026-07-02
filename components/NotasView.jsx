"use client";

export default function NotasView({ notas, dispatch }) {
  return (
    <section className="card notas-card">
      <div className="card-head">
        <h2><span className="dot" style={{ background: "var(--comida)" }} />Notas</h2>
        <span className="meta">salva automaticamente</span>
      </div>
      <textarea
        className="notas-area"
        value={notas}
        placeholder="Bloco livre — ideias, links, lembretes, listas… fica sempre aqui, fora do dia."
        onChange={(e) => dispatch({ type: "SET_NOTAS", value: e.target.value })}
      />
    </section>
  );
}
