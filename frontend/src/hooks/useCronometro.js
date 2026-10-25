import { useEffect, useRef, useState } from 'react';

export const formatoTiempo = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Tres pitidos y vibración (si el celular lo permite)
function sonar(ctx) {
  if (ctx) {
    [0, 0.35, 0.7].forEach((retraso) => {
      const t = ctx.currentTime + retraso;
      const osc = ctx.createOscillator();
      const ganancia = ctx.createGain();
      osc.frequency.value = 880;
      ganancia.gain.setValueAtTime(0.0001, t);
      ganancia.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(ganancia);
      ganancia.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
}

export default function useCronometro() {
  const [total, setTotal] = useState(0);
  const [restante, setRestante] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const fin = useRef(0);
  const audio = useRef(null);

  // El navegador solo deja sonar audio después de un toque del usuario,
  // por eso se prepara al apretar iniciar
  const prepararAudio = () => {
    if (!audio.current) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (Contexto) audio.current = new Contexto();
    }
    if (audio.current && audio.current.resume) audio.current.resume();
  };

  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => {
      const falta = Math.max(0, Math.ceil((fin.current - Date.now()) / 1000));
      setRestante(falta);
      if (falta === 0) {
        setCorriendo(false);
        setTerminado(true);
        sonar(audio.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [corriendo]);

  // Muestra el tiempo en la pestaña del navegador
  useEffect(() => {
    if (!corriendo) return;
    const anterior = document.title;
    document.title = `⏱ ${formatoTiempo(restante)} · FitCoach`;
    return () => {
      document.title = anterior;
    };
  }, [corriendo, restante]);

  const iniciar = (segundos) => {
    prepararAudio();
    fin.current = Date.now() + segundos * 1000;
    setTotal(segundos);
    setRestante(segundos);
    setTerminado(false);
    setCorriendo(true);
    setAbierto(true);
  };

  const pausar = () => {
    setRestante(Math.max(0, Math.ceil((fin.current - Date.now()) / 1000)));
    setCorriendo(false);
  };

  const reanudar = () => {
    prepararAudio();
    fin.current = Date.now() + restante * 1000;
    setCorriendo(true);
  };

  const reiniciar = () => {
    setCorriendo(false);
    setTerminado(false);
    setRestante(0);
    setTotal(0);
  };

  return { total, restante, corriendo, terminado, abierto, setAbierto, iniciar, pausar, reanudar, reiniciar };
}