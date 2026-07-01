"use client";
import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { reducer, initialState } from "@/state/reducer";
import { initBackend } from "@/lib/backend";
import { blankDay, ensureIds, SEED, DEFAULTS } from "@/lib/model";
import { todayKey } from "@/lib/date";

export function useTracker() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const backendRef = useRef(null);
  const stateRef = useRef(state);
  const saveT = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  stateRef.current = state;

  // relogio (1s)
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // boot: backend + config + dia de hoje
  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await initBackend();
      if (!alive) return;
      backendRef.current = b;
      const cfg = (await b.getConfig()) || { ...DEFAULTS };
      let day = await b.getDay(todayKey());
      if (!day) {
        day = blankDay();
        day.agenda = structuredClone(SEED);
      }
      dispatch({ type: "INIT", mode: b.mode, cfg: { ...DEFAULTS, ...cfg }, dayKey: todayKey(), day: ensureIds(day) });
    })();
    return () => { alive = false; };
  }, []);

  // persistencia do dia (debounce 350ms)
  useEffect(() => {
    if (!state.ready || !backendRef.current) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      backendRef.current.setDay(state.dayKey, state.day);
    }, 350);
  }, [state.day, state.dayKey, state.ready]);

  // persistencia da config
  useEffect(() => {
    if (!state.ready || !backendRef.current) return;
    backendRef.current.setConfig(state.cfg);
  }, [state.cfg, state.ready]);

  // commit do timer ao fechar/ocultar a aba
  useEffect(() => {
    const flush = () => {
      const s = stateRef.current;
      if (!backendRef.current) return;
      let day = s.day;
      if (s.timer.running) {
        const el = (Date.now() - s.timer.startedAt) / 1000;
        day = { ...day, trabalho: { segundos: day.trabalho.segundos + el } };
      }
      backendRef.current.setDay(s.dayKey, day);
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey && !inField) { e.preventDefault(); dispatch({ type: "UNDO" }); }
      else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) && !inField) { e.preventDefault(); dispatch({ type: "REDO" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // troca de dia (salva o atual com o timer commitado, carrega o novo)
  const loadDay = useCallback(async (key) => {
    const b = backendRef.current;
    const s = stateRef.current;
    if (b) {
      let day = s.day;
      if (s.timer.running) {
        const el = (Date.now() - s.timer.startedAt) / 1000;
        day = { ...day, trabalho: { segundos: day.trabalho.segundos + el } };
      }
      await b.setDay(s.dayKey, day);
      let nd = await b.getDay(key);
      if (!nd) {
        nd = blankDay();
        if (key === todayKey()) nd.agenda = structuredClone(SEED);
      }
      dispatch({ type: "LOAD_DAY", dayKey: key, day: ensureIds(nd) });
    }
  }, []);

  const getRange = useCallback((keys) => backendRef.current?.getRange(keys) || {}, []);

  // segundos vivos do trabalho
  const liveSeconds = state.day.trabalho.segundos + (state.timer.running ? (now - state.timer.startedAt) / 1000 : 0);

  return { state, dispatch, now, liveSeconds, loadDay, getRange };
}
