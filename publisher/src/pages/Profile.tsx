import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Profile {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

export default function ProfilePage() {
  const [p, setP] = useState<Profile>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { profile } = await api<{ profile: Profile }>("/api/v1/me/profile");
        setP(profile ?? {});
      } catch (e) {
        setMsg(String(e));
      }
    })();
  }, []);

  async function save() {
    setMsg(null);
    try {
      await api("/api/v1/me/profile", { method: "PATCH", body: JSON.stringify(p) });
      setMsg("Saved ✓");
    } catch (e) {
      setMsg(String(e));
    }
  }

  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {(["username", "display_name", "bio", "avatar_url"] as const).map((k) => (
        <label key={k} className="block">
          <span className="text-xs uppercase text-slate-400">{k.replace("_", " ")}</span>
          <input
            value={p[k] ?? ""}
            onChange={(e) => setP({ ...p, [k]: e.target.value })}
            className="w-full mt-1 px-3 py-2 bg-card border border-slate-700 rounded text-sm"
          />
        </label>
      ))}
      <button onClick={save} className="px-4 py-2 bg-brand rounded text-white text-sm">Save</button>
      {msg && <p className="text-slate-400 text-sm">{msg}</p>}
    </div>
  );
}
