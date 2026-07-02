"use client";
import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { reducer, initialState } from "@/state/reducer";
import { makeLocalBackend, makeFirebaseBackend } from "@/lib/backend";
import { firebaseEnabled } from "@/lib/firebase";
import { watchAuth } from "@/lib/auth";
import { blankDay, ensureIds, seedAgenda, DEFAULTS } from "@/lib/model";
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

  // boot: carrega config + dia de hoje de um backend e sinaliza pronto
  const bootFrom = async (b, user, alive) => {
    if (!alive()) return;
    backendRef.current = b;
    const cfg = { ...DEFAULTS, ...((await b.getConfig()) || {}) };
    let day = await b.getDay(todayKey());
    if (!day) {
      day = blankDay();
      day.agenda = seedAgenda(todayKey(), cfg.rotinas);
    }
    if (!alive()) return;
    dispatch({ type: "INIT", mode: b.mode, user, cfg, dayKey: todayKey(), day: ensureIds(day) });
  };

  // boot: modo local direto, ou observa o login do Firebase (tela de login/sessao)
  useEffect(() => {
    let alive = true;
    const isAlive = () => alive;
    let unsub = () => {};
    (async () => {
      if (!firebaseEnabled) {
        await bootFrom(makeLocalBackend(), null, isAlive);
        return;
      }
      unsub = await watchAuth(async (user) => {
        if (!alive) return;
        if (!user) {
          backendRef.current = null;
          dispatch({ type: "NEEDS_LOGIN" });
          return;
        }
        try {
          await bootFrom(await makeFirebaseBackend(user.uid), user, isAlive);
        } catch (e) {
          console.warn("Firestore indisponivel, modo local:", e);
          await bootFrom(makeLocalBackend(), user, isAlive);
        }
      });
    })();
    return () => { alive = false; unsub && unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // semeia rotinas em dias de hoje em diante (não fabrica tarefas no passado)
        if (key >= todayKey()) nd.agenda = seedAgenda(key, s.cfg.rotinas);
      }
      dispatch({ type: "LOAD_DAY", dayKey: key, day: ensureIds(nd) });
    }
  }, []);

  const getRange = useCallback((keys) => backendRef.current?.getRange(keys) || {}, []);

  // segundos vivos do trabalho
  const liveSeconds = state.day.trabalho.segundos + (state.timer.running ? (now - state.timer.startedAt) / 1000 : 0);

  return { state, dispatch, now, liveSeconds, loadDay, getRange };
}
