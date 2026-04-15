import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-50">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <button
          className="md:hidden p-3 text-slate-300"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >☰</button>
        <main className="p-6 max-w-4xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
