import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

const insertedRows: unknown[] = [];
const supabaseMock = createSupabaseMock((state) => {
  if (state.table === "feeds" && state.op === "select") {
    const idFilter = state.filters.find((f) => f.column === "id")?.value;
    if (idFilter === "missing-feed") return { data: null, error: { message: "not found" } };
    if (idFilter === "other-feed") return { data: { id: "other-feed", user_id: "other-user", feed_url: "https://example.com/aif.json" }, error: null };
    if (idFilter) {
      return {
        data: {
          id: idFilter,
          user_id: "user-1",
          title: "Feed",
          description: "Description",
          domain: "tech",
          cadence: "daily",
          feed_url: "https://example.com/aif.json",
          is_public: true,
          is_verified: true,
          created_at: "2026-05-22T00:00:00.000Z",
          updated_at: "2026-05-22T01:00:00.000Z",
        },
        error: null,
      };
    }
    return {
      data: [{ id: "feed-1", title: "Feed", domain: "tech", subscriber_count: 5 }],
      error: null,
    };
  }
  if (state.table === "feeds" && state.op === "insert") {
    insertedRows.push(state.values);
    return { data: { id: "feed-created", ...(state.values as object) }, error: null };
  }
  if (state.table === "feeds" && state.op === "update") return { data: null, error: null };
  if (state.table === "feed_items" && state.op === "select") {
    if (state.head) return { data: null, count: 0, error: null };
    return {
      data: [
        {
          id: "item-1",
          external_id: "33333333-3333-4333-8333-333333333333",
          feed_id: "feed-1",
          title: "Item",
          summary: "Summary",
          content: "Content",
          confidence: 0.9,
          signals: ["signal"],
          source_urls: ["https://example.com/source"],
          agent_model: "model",
          tags: ["tag"],
          published_at: "2026-05-22T01:00:00.000Z",
          created_at: "2026-05-22T01:00:00.000Z",
        },
      ],
      count: 1,
      error: null,
    };
  }
  if (state.table === "feed_items" && state.op === "insert") {
    const rows = Array.isArray(state.values) ? state.values : [state.values];
    return { data: rows.map((row, i) => ({ id: `item-${i + 1}`, ...row })), error: null };
  }
  if (state.table === "profiles") {
    return { data: { display_name: "Publisher", username: "publisher" }, error: null };
  }
  if (state.table === "subscriptions" && state.op === "insert") return { data: null, error: null };
  if (state.table === "subscriptions" && state.op === "delete") return { data: null, error: null };
  if (state.table === "subscriptions" && state.op === "select") return { data: [], count: 0, error: null };
  if (state.table === "notification_channels" && state.op === "insert") {
    return { data: { id: "channel-1", ...(state.values as object) }, error: null };
  }
  if (state.table === "notification_channels" && state.op === "select") return { data: [], error: null };
  if (state.table === "notification_channels" && ["update", "delete"].includes(state.op)) return { data: null, error: null };
  if (state.table === "api_keys" && state.op === "select") return { data: [], error: null };
  if (state.table === "api_keys" && state.op === "insert") {
    return { data: { id: "api-key-1", feed_id: "feed-1", label: "CI", created_at: "2026-05-22T00:00:00.000Z" }, error: null };
  }
  if (state.table === "api_keys" && state.op === "delete") return { data: null, error: null };
  return { data: null, error: null, count: 0 };
});

vi.mock("../../../backend/src/supabase", () => supabaseMock);
vi.mock("../../../backend/src/services/notifier", () => ({ notifySubscribers: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../backend/src/services/verification", () => ({ maybeMarkVerified: vi.fn().mockResolvedValue(undefined) }));

describe("backend app integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    supabaseMock.supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    });
    supabaseMock.supabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "user-created", email: "new@example.com" } },
      error: null,
    });
    supabaseMock.supabaseAnon.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "access", refresh_token: "refresh", expires_at: 123 },
        user: { id: "user-1", email: "user@example.com" },
      },
      error: null,
    });
  });

  it("serves health and 404 responses", async () => {
    const { app } = await import("../../../backend/src/app");

    await request(app).get("/health").expect(200, { ok: true, service: "aif-backend" });
    await request(app).get("/missing").expect(404, { error: "not found" });
  });

  it("allows configured CORS origins", async () => {
    const { app } = await import("../../../backend/src/app");

    const res = await request(app).get("/health").set("Origin", "http://localhost:5173").expect(200);

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("validates and handles auth register/login", async () => {
    const { app } = await import("../../../backend/src/app");

    await request(app).post("/api/v1/auth/register").send({ email: "bad", password: "short" }).expect(400);
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "new@example.com", password: "password123", username: "new" })
      .expect(201);
    await request(app).post("/api/v1/auth/login").send({ email: "user@example.com", password: "password123" }).expect(200);
  });

  it("lists feeds and creates a hosted feed for authenticated users", async () => {
    const { app } = await import("../../../backend/src/app");

    await request(app).get("/api/v1/feeds?domain=tech&search=Feed&sort=new").expect(200);
    await request(app)
      .post("/api/v1/feeds/hosted")
      .set("Authorization", "Bearer jwt")
      .send({ title: "Hosted", domain: "tech", cadence: "daily" })
      .expect(201);

    expect(insertedRows.length).toBeGreaterThan(0);
  });

  it("covers item publish auth, validation, ownership, and success paths", async () => {
    const { app } = await import("../../../backend/src/app");
    const validItem = {
      title: "Published",
      summary: "Summary",
      content: "Content",
      confidence: 0.7,
      source_urls: ["https://example.com/source"],
    };

    await request(app).post("/api/v1/feeds/feed-1/items").send(validItem).expect(401);
    await request(app).post("/api/v1/feeds/feed-1/items").set("Authorization", "Bearer jwt").send({}).expect(400);
    await request(app).post("/api/v1/feeds/missing-feed/items").set("Authorization", "Bearer jwt").send(validItem).expect(404);
    await request(app).post("/api/v1/feeds/other-feed/items").set("Authorization", "Bearer jwt").send(validItem).expect(403);
    await request(app).post("/api/v1/feeds/feed-1/items").set("Authorization", "Bearer jwt").send(validItem).expect(201);
    await request(app)
      .post("/api/v1/feeds/feed-1/items")
      .set("Authorization", "Bearer jwt")
      .send(Array.from({ length: 11 }, () => validItem))
      .expect(400);
  });

  it("serves hosted public AIF JSON", async () => {
    const { app } = await import("../../../backend/src/app");

    const res = await request(app).get("/feeds/feed-1/aif.json").expect(200);

    expect(res.headers["content-type"]).toContain("application/aif+json");
    expect(res.body.aif).toBe("1.0");
    expect(res.body.items).toHaveLength(1);
  });

  it("validates notification channels and API key ownership", async () => {
    const { app } = await import("../../../backend/src/app");

    await request(app)
      .post("/api/v1/me/notifications")
      .set("Authorization", "Bearer jwt")
      .send({ channel_type: "webhook", config: { webhook_url: "http://not-secure.test" } })
      .expect(400);
    await request(app)
      .post("/api/v1/me/notifications")
      .set("Authorization", "Bearer jwt")
      .send({ channel_type: "webhook", config: { webhook_url: "https://hooks.example.com/aif" } })
      .expect(201);
    const keyRes = await request(app)
      .post("/api/v1/me/api-keys")
      .set("Authorization", "Bearer jwt")
      .send({ feed_id: "11111111-1111-4111-8111-111111111111", label: "CI" })
      .expect(201);

    expect(keyRes.body.key).toMatch(/^aif_sk_/);
  });
});
