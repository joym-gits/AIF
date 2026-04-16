import sharp from "sharp";

export interface CardData {
  title: string;
  summary: string;
  confidence: number;
  signals: string[];
  feedTitle: string;
  domain: string;
}

// ── Palette ──────────────────────────────────────────────────────────
const BG = "#0f0f13";
const CARD = "#1a1a24";
const CARD_BORDER = "#2a2a3a";
const WHITE = "#f1f5f9";
const MUTED = "#94a3b8";
const PILL_BG = "#2a2a3a";
const SIGNAL_BG = "#1e293b";
const SIGNAL_BORDER = "#334155";
const LOGO_COLOR = "#6366f1"; // indigo

const DOMAIN_COLORS: Record<string, { bg: string; fg: string }> = {
  healthcare: { bg: "#064e3b", fg: "#6ee7b7" },
  health:     { bg: "#064e3b", fg: "#6ee7b7" },
  finance:    { bg: "#1e3a5f", fg: "#7dd3fc" },
  legal:      { bg: "#78350f", fg: "#fcd34d" },
  research:   { bg: "#3b0764", fg: "#c084fc" },
  tech:       { bg: "#0c4a6e", fg: "#7dd3fc" },
  technology: { bg: "#0c4a6e", fg: "#7dd3fc" },
  general:    { bg: "#1e293b", fg: "#94a3b8" },
};

function domainColor(domain: string): { bg: string; fg: string } {
  const key = (domain ?? "").toLowerCase().trim();
  return DOMAIN_COLORS[key] ?? DOMAIN_COLORS.general;
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return "#22c55e";
  if (c >= 0.5) return "#f59e0b";
  return "#ef4444";
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
}

// ── Text truncation (approximate) ────────────────────────────────────
// At ~18px per char for 28px font, 1100px wide card inner ≈ ~61 chars
function truncate(text: string, maxChars: number): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Wrap text into lines of ~maxChars, returns array of lines
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }
  // Truncate last line if we hit limit
  if (lines.length === maxLines && current && !lines[lines.length - 1].endsWith(current.slice(-5))) {
    lines[lines.length - 1] = lines[lines.length - 1] + "…";
  }
  return lines.length ? lines : [""];
}

// ── SVG Builder ──────────────────────────────────────────────────────
function buildSvg(data: CardData): string {
  const W = 1200;
  const H = 630;
  const PAD = 50;
  const CARD_X = 30;
  const CARD_Y = 30;
  const CARD_W = W - 60;
  const CARD_H = H - 60;
  const INNER_X = CARD_X + PAD;
  const INNER_W = CARD_W - PAD * 2;

  const dc = domainColor(data.domain);
  const cc = confidenceColor(data.confidence);
  const confPct = Math.round(data.confidence * 100);
  const confBarWidth = Math.round((data.confidence) * INNER_W);

  // Title: 2 lines max, ~48 chars per line at 32px bold
  const titleLines = wrapText(data.title || "Untitled", 52, 2);
  // Summary: 2 lines max, ~72 chars per line at 18px
  const summaryLines = wrapText(data.summary || "", 80, 2);
  // Signals: first 4
  const signals = (data.signals ?? []).slice(0, 4);

  // Build signal pills SVG
  let signalsSvg = "";
  let sx = INNER_X;
  for (const sig of signals) {
    const label = truncate(sig, 22);
    const pillW = label.length * 9 + 24;
    signalsSvg += `
      <rect x="${sx}" y="440" width="${pillW}" height="32" rx="16" fill="${SIGNAL_BG}" stroke="${SIGNAL_BORDER}" stroke-width="1"/>
      <text x="${sx + pillW / 2}" y="461" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${MUTED}" text-anchor="middle">${escXml(label)}</text>
    `;
    sx += pillW + 10;
    if (sx > INNER_X + INNER_W - 80) break;
  }

  const domainLabel = escXml((data.domain || "general").charAt(0).toUpperCase() + (data.domain || "general").slice(1));
  const feedLabel = escXml(truncate(data.feedTitle || "Feed", 30));

  // Domain pill width
  const domainPillW = domainLabel.length * 9 + 28;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="card-clip">
      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="20"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Card -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="20" fill="${CARD}" stroke="${CARD_BORDER}" stroke-width="1"/>

  <!-- Accent line top -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="4" rx="0" fill="${LOGO_COLOR}" clip-path="url(#card-clip)"/>

  <!-- Feed title -->
  <text x="${INNER_X}" y="86" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="16" fill="${MUTED}" font-weight="500">${feedLabel}</text>

  <!-- Domain badge -->
  <rect x="${INNER_X + feedLabel.length * 9 + 16}" y="70" width="${domainPillW}" height="26" rx="13" fill="${dc.bg}"/>
  <text x="${INNER_X + feedLabel.length * 9 + 16 + domainPillW / 2}" y="88" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="13" fill="${dc.fg}" text-anchor="middle" font-weight="600">${domainLabel}</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="${INNER_X}" y="${145 + i * 42}" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="34" fill="${WHITE}" font-weight="700">${escXml(line)}</text>`).join("\n  ")}

  <!-- Summary -->
  ${summaryLines.map((line, i) => `<text x="${INNER_X}" y="${245 + i * 28}" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="18" fill="${MUTED}">${escXml(line)}</text>`).join("\n  ")}

  <!-- Confidence section -->
  <text x="${INNER_X}" y="340" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${MUTED}" font-weight="500" text-transform="uppercase" letter-spacing="1.5">CONFIDENCE</text>

  <!-- Confidence bar background -->
  <rect x="${INNER_X}" y="355" width="${INNER_W}" height="8" rx="4" fill="${PILL_BG}"/>
  <!-- Confidence bar fill -->
  <rect x="${INNER_X}" y="355" width="${confBarWidth}" height="8" rx="4" fill="${cc}"/>

  <!-- Confidence value -->
  <text x="${INNER_X + confBarWidth + 12}" y="363" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${cc}" font-weight="700">${confPct}%</text>
  <text x="${INNER_X + confBarWidth + 54}" y="363" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${MUTED}">${confidenceLabel(data.confidence)}</text>

  <!-- Confidence dot indicator -->
  <circle cx="${INNER_X + confBarWidth}" cy="359" r="6" fill="${cc}"/>

  <!-- Signals label -->
  ${signals.length > 0 ? `<text x="${INNER_X}" y="420" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${MUTED}" font-weight="500" letter-spacing="1.5">SIGNALS</text>` : ""}

  <!-- Signal pills -->
  ${signalsSvg}

  <!-- Bottom divider -->
  <line x1="${INNER_X}" y1="500" x2="${INNER_X + INNER_W}" y2="500" stroke="${CARD_BORDER}" stroke-width="1"/>

  <!-- AIF branding -->
  <rect x="${INNER_X}" y="524" width="48" height="28" rx="6" fill="${LOGO_COLOR}"/>
  <text x="${INNER_X + 24}" y="544" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="16" fill="${WHITE}" text-anchor="middle" font-weight="800">AIF</text>
  <text x="${INNER_X + 62}" y="544" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="16" fill="${MUTED}">AI Intelligence Feed</text>

  <!-- Subscribe text bottom-right -->
  <text x="${INNER_X + INNER_W}" y="544" font-family="Liberation Sans, DejaVu Sans, Arial, Helvetica, sans-serif" font-size="14" fill="${MUTED}" text-anchor="end">aif.to · Subscribe for AI-curated intelligence</text>
</svg>`;

  return svg;
}

// ── Public API ────────────────────────────────────────────────────────
export async function renderCard(data: CardData): Promise<Buffer> {
  const svg = buildSvg(data);
  const png = await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png({ quality: 90, compressionLevel: 6 })
    .toBuffer();
  return png;
}
