"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ label = "⏻ Cerrar sesión" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      disabled={loading}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:text-white"
    >
      {loading ? "Saliendo…" : label}
    </button>
  );
}
