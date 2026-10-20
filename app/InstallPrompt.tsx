"use client";

import { useEffect, useState } from "react";

/**
 * Aviso "Agregar a pantalla de inicio".
 * - Android/Chrome: usa el evento nativo beforeinstallprompt y muestra un banner con botón Instalar.
 * - iOS Safari: muestra instrucciones (Compartir → Agregar a inicio).
 * Se recuerda en localStorage para no molestar si el usuario lo cierra,
 * y no aparece si la app ya está instalada (display-mode: standalone).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Registro del service worker (requerido para que Chrome ofrezca la instalación).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // ¿Ya instalada como app?
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(ios);

    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // En iOS no hay evento nativo: mostramos las instrucciones a los 3 segundos.
    if (ios) {
      const t = setTimeout(() => setShow(true), 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem("pwa-dismissed", "1");
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") close();
      setDeferred(null);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur sm:left-1/2 sm:w-96 sm:-translate-x-1/2">
      <button
        onClick={close}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-zinc-500 transition hover:text-zinc-300"
      >
        ✕
      </button>
      <div className="flex items-start gap-3">
        <span className="text-3xl">📅</span>
        <div className="flex-1">
          <p className="font-semibold">Instala ProAgenda en tu celular</p>
          {isIOS ? (
            <p className="mt-1 text-sm text-zinc-400">
              Toca <strong>Compartir</strong> ⬆️ y luego{" "}
              <strong>“Agregar a pantalla de inicio”</strong>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Acceso directo desde tu pantalla de inicio, como una app.
            </p>
          )}
        </div>
      </div>
      {!isIOS && (
        <button
          onClick={install}
          className="mt-3 w-full rounded-xl bg-gold-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-gold-400"
        >
          📲 Instalar ahora
        </button>
      )}
    </div>
  );
}
