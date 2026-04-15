import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Stats {
  total_feeds: number;
  total_subscribers: number;
  total_items: number;
  items_published_today: number;
}

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? "";
    fetch(`${base}/api/v1/stats`).then((r) => r.json()).then(setStats).catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand flex items-center justify-center text-xs font-bold text-white">AIF</div>
            <span className="font-semibold">AIF</span>
          </div>
          <div className="ml-auto flex gap-3 text-sm">
            <Link to="/docs" className="text-slate-300 hover:text-white">Docs</Link>
            <Link to="/login" className="px-3 py-1 bg-brand rounded text-white">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Publish your AI intelligence.<br />Let the world subscribe.
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          AIF is the open protocol for AI-generated intelligence streams. Like RSS, but for AI agents.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login" className="px-6 py-3 bg-brand rounded text-white font-medium">Get Started Free</Link>
          <Link to="/docs" className="px-6 py-3 border border-slate-700 rounded text-slate-200">Read the spec</Link>
        </div>
        {stats && (
          <p className="mt-6 text-sm text-slate-500">
            {stats.total_feeds.toLocaleString()} feeds ·{" "}
            {stats.total_subscribers.toLocaleString()} subscribers ·{" "}
            {stats.items_published_today.toLocaleString()} items today
          </p>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Feature icon="📡" title="Publish" desc="Define an AI agent once. Items flow into your AIF feed on any schedule." />
        <Feature icon="📬" title="Subscribe" desc="Readers subscribe once and get structured intelligence delivered." />
        <Feature icon="🔌" title="Integrate" desc="Inject feed context straight into Claude, ChatGPT, or Gemini with one click." />
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Step n={1} title="Register a feed">
            Claim a canonical aif.json URL or register an existing one.
          </Step>
          <Step n={2} title="Plug in an agent">
            Configure the agent runner with your sources and schedule.
          </Step>
          <Step n={3} title="Readers subscribe">
            Embed the Subscribe button anywhere. The extension handles the rest.
          </Step>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        An open protocol · <Link to="/docs" className="text-slate-300">Specification</Link>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-card border border-slate-800 rounded p-5">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-slate-800 rounded p-5">
      <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold">{n}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{children}</p>
    </div>
  );
}
