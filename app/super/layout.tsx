import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "../LogoutButton";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* Sidebar: escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-52 flex-col bg-zinc-900 text-zinc-300 md:flex">
        <div className="border-b border-zinc-800 px-5 py-5">
          <p className="text-lg font-bold text-white">🛡️ Plataforma</p>
          <p className="text-xs text-zinc-500">{session.name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <Link href="/super" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-zinc-800 hover:text-white">
            🔑 Logins de barberías
          </Link>
        </nav>
        <div className="border-t border-zinc-800 p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Barra superior: móvil */}
      <header className="sticky top-0 z-40 flex items-center gap-2 bg-zinc-900 px-3 py-2.5 md:hidden">
        <span className="mr-1 shrink-0 text-lg">🛡️</span>
        <Link
          href="/super"
          className="shrink-0 whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 active:bg-zinc-700"
        >
          🔑 Logins de barberías
        </Link>
      </header>

      <main className="p-4 md:ml-52 md:p-6">{children}</main>
    </div>
  );
}
