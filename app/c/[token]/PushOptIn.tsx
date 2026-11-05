"use client";

import { useEffect, useState } from "react";

/**
 * Pide permiso de notificaciones y registra la suscripción push del
 * navegador. Se muestra como un banner no intrusivo; si el usuario
 * rechaza, no vuelve a preguntar (se guarda en localStorage).
 *
 * `token` vincula el dispositivo al cliente de la reserva para que el
 * cron le envíe el recordatorio 1 día antes de su cita.
 */
export default function PushOptIn({ token }: { token?: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (localStorage.getItem("push-dismissed") === "1") return;
    if (Notification.permission === "granted") return; // ya activas
    if (Notification.permission === "denied") return;
    // Pregunta automática al poco de cargar la página
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("No activaste las notificaciones.");
        localStorage.setItem("push-dismissed", "1");
        setVisible(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      // La clave pública VAPID la entrega el propio SW/server vía header;
      // se pide al endpoint de configuración.
      const cfg = await fetch("/api/push/config").then((r) => r.json());
      if (!cfg.publicKey) throw new Error("Push no configurado");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), token }),
      });
      // Enviar de inmediato la pregunta de confirmación a este celular.
      if (token) {
        await fetch("/api/push/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      setVisible(false);
    } catch (e) {
      console.warn("[push] error al suscribir:", e);
      setState("No se pudieron activar las notificaciones en este dispositivo.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("push-dismissed", "1");
    setVisible(false);
  };

  if (!visible) {
    if (state) return <p className="mt-2 text-center text-xs text-zinc-500">{state}</p>;
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm">
      <p className="font-medium text-zinc-100">🔔 ¿Te avisamos de tu cita?</p>
      <p className="mt-1 text-xs text-zinc-400">
        Activa las notificaciones y te recordaremos un día antes, sin llamadas ni mensajes.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={subscribe}
          disabled={busy}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Activando…" : "Sí, avisarme"}
        </button>
        <button onClick={dismiss} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400">
          Ahora no
        </button>
      </div>
    </div>
  );
}

/** Convierte la clave VAPID base64url a Uint8Array (requerido por pushManager). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
