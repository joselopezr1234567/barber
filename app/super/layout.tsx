import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "../LogoutButton";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "PLATFORM_ADMIN") redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside className="flex w-52 shrink-0 flex-col bg-zinc-900 text-zinc-300">
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
