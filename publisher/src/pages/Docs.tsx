import { useEffect, useMemo } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import whatIsAif from "../docs/what-is-aif.md?raw";
import quickStart from "../docs/quick-start.md?raw";
import publishers from "../docs/publishers.md?raw";
import readers from "../docs/readers.md?raw";
import agentRunner from "../docs/agent-runner.md?raw";
import apiReference from "../docs/api-reference.md?raw";
import faq from "../docs/faq.md?raw";
import protocolSpec from "../../../protocol/AIF-SPEC.md?raw";

interface DocPage {
  slug: string;
  title: string;
  content: string;
  group: string;
}

const PAGES: DocPage[] = [
  { slug: "what-is-aif", title: "What is AIF?", content: whatIsAif, group: "Overview" },
  { slug: "quick-start", title: "Quick start", content: quickStart, group: "Overview" },
  { slug: "publishers", title: "For publishers", content: publishers, group: "Guides" },
  { slug: "readers", title: "For readers", content: readers, group: "Guides" },
  { slug: "agent-runner", title: "Agent-runner", content: agentRunner, group: "Guides" },
  { slug: "protocol-spec", title: "Protocol spec", content: protocolSpec, group: "Reference" },
  { slug: "api-reference", title: "API reference", content: apiReference, group: "Reference" },
  { slug: "faq", title: "FAQ & troubleshooting", content: faq, group: "Reference" },
];

const GROUPS = Array.from(new Set(PAGES.map((p) => p.group)));

export default function Docs() {
  const { slug } = useParams<{ slug?: string }>();
  const nav = useNavigate();

  const active = useMemo(
    () => PAGES.find((p) => p.slug === slug) ?? PAGES[0],
    [slug],
  );

  useEffect(() => {
    if (!slug) nav(`/docs/${PAGES[0].slug}`, { replace: true });
    document.title = `${active.title} — AIF docs`;
  }, [slug, active, nav]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-1.5 rounded text-sm ${
      isActive ? "bg-brand text-white" : "text-slate-300 hover:bg-slate-800"
    }`;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      <aside className="w-60 shrink-0 border-r border-slate-800 pr-4 hidden md:block">
        <div className="sticky top-4 space-y-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Documentation</div>
          {GROUPS.map((g) => (
            <div key={g} className="space-y-1">
              <div className="text-xs uppercase text-slate-500 px-3">{g}</div>
              {PAGES.filter((p) => p.group === g).map((p) => (
                <NavLink key={p.slug} to={`/docs/${p.slug}`} className={linkCls}>
                  {p.title}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 max-w-3xl" data-color-mode="dark">
        <div className="md:hidden mb-4">
          <select
            value={active.slug}
            onChange={(e) => nav(`/docs/${e.target.value}`)}
            className="w-full px-3 py-2 bg-card border border-slate-700 rounded text-sm"
          >
            {PAGES.map((p) => (
              <option key={p.slug} value={p.slug}>{p.group} — {p.title}</option>
            ))}
          </select>
        </div>
        <article className="prose-docs">
          <MDEditor.Markdown
            source={active.content}
            style={{ background: "transparent", color: "#e2e8f0" }}
          />
        </article>
      </div>
    </div>
  );
}
