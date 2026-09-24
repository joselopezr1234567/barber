import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "../LogoutButton";

const NAV = [
  { href: "/admin", label: "Agenda", icon: "🗓️" },
  { href: "/admin/trabajadores", label: "Trabajadores", icon: "👷" },
  { href: "/admin/horarios", label: "Horarios", icon: "⏰" },
  { href: "/admin/servicios", label: "Servicios", icon: "✂️" },
  { href: "/admin/clientes", label: "Clientes", icon: "👤" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SHOP_OWNER") redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      {/* Sidebar */}
      <aside className="flex w-52 shrink-0 flex-col bg-zinc-900 text-zinc-300">
        <div className="border-b border-zinc-800 px-5 py-5">
          <p className="text-lg font-bold text-white">💈 Barbería</p>
          <p className="text-xs text-zinc-500">{session.name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-zinc-800 hover:text-white"
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-3">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition hover:text-white">
            ← Ver sitio público
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
