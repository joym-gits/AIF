import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AIFDomain, AIFCadence } from "@aif/shared";

type Path = "register" | "create";

export default function NewFeed() {
  const [path, setPath] = useState<Path>("register");
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New feed</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setPath("register")}
          className={`px-3 py-1.5 rounded text-sm ${path === "register" ? "bg-brand text-white" : "bg-card text-slate-300"}`}
        >
          Register existing URL
        </button>
        <button
          onClick={() => setPath("create")}
          className={`px-3 py-1.5 rounded text-sm ${path === "create" ? "bg-brand text-white" : "bg-card text-slate-300"}`}
        >
          Create hosted feed
        </button>
      </div>
      {path === "register" ? <RegisterPath /> : <CreatePath />}
    </div>
  );
}

function RegisterPath() {
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ kind: "ok"; id: string } | { kind: "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await api<{ id: string }>("/api/v1/feeds", {
        method: "POST",
        body: JSON.stringify({ feed_url: url }),
      });
      setResult({ kind: "ok", id: res.id });
      setTimeout(() => nav(`/feeds/${res.id}`), 600);
    } catch (e) {
      setResult({ kind: "err", msg: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card border border-slate-800 rounded p-4 space-y-3">
      <p className="text-sm text-slate-400">
        Enter the HTTPS URL of your aif.json. The backend will fetch and validate it.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/aif.json"
        className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
      />
      <button disabled={busy || !url} onClick={submit} className="px-4 py-2 bg-brand rounded text-white text-sm disabled:opacity-50">
        {busy ? "Validating…" : "Register feed"}
      </button>
      {result?.kind === "ok" && (
        <p className="text-emerald-400 text-sm">Feed valid — registered ✓</p>
      )}
      {result?.kind === "err" && (
        <pre className="text-rose-400 text-xs whitespace-pre-wrap">{result.msg}</pre>
      )}
    </div>
  );
}

function CreatePath() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    domain: "general" as AIFDomain,
    cadence: "daily" as AIFCadence,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ id: string }>("/api/v1/feeds/hosted", {
        method: "POST",
        body: JSON.stringify(form),
      });
      nav(`/feeds/${res.id}`);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card border border-slate-800 rounded p-4 space-y-3">
      <Field label="Title">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm h-20"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Domain">
          <select
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value as AIFDomain })}
            className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
          >
            {["healthcare", "finance", "legal", "research", "tech", "general"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Cadence">
          <select
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value as AIFCadence })}
            className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
          >
            {["realtime", "daily", "weekly", "monthly"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <button disabled={busy || !form.title} onClick={submit} className="px-4 py-2 bg-brand rounded text-white text-sm disabled:opacity-50">
        {busy ? "Creating…" : "Create feed"}
      </button>
      {err && <pre className="text-rose-400 text-xs whitespace-pre-wrap">{err}</pre>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
