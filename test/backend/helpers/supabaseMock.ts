import { vi } from "vitest";

type QueryState = {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  selectColumns?: string;
  values?: unknown;
  filters: Array<{ column: string; value: unknown }>;
  single: boolean;
  count?: "exact";
  head?: boolean;
  range?: [number, number];
  limit?: number;
  order?: { column: string; ascending?: boolean };
  upsertOptions?: unknown;
};

type Handler = (state: QueryState) => unknown | Promise<unknown>;

function createBuilder(table: string, handler: Handler) {
  const state: QueryState = {
    table,
    op: "select",
    filters: [],
    single: false,
  };
  const builder = {
    select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
      if (!state.values && state.op !== "delete") state.op = "select";
      state.selectColumns = columns;
      state.count = options?.count;
      state.head = options?.head;
      return builder;
    },
    insert(values: unknown) {
      state.op = "insert";
      state.values = values;
      return builder;
    },
    update(values: unknown) {
      state.op = "update";
      state.values = values;
      return builder;
    },
    delete() {
      state.op = "delete";
      return builder;
    },
    upsert(values: unknown, options?: unknown) {
      state.op = "upsert";
      state.values = values;
      state.upsertOptions = options;
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    ilike(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    not(column: string, _operator: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    in(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      state.order = { column, ascending: options?.ascending };
      return builder;
    },
    limit(value: number) {
      state.limit = value;
      return builder;
    },
    range(from: number, to: number) {
      state.range = [from, to];
      return builder;
    },
    single() {
      state.single = true;
      return builder;
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(handler({ ...state, filters: [...state.filters] })).then(resolve, reject);
    },
    catch(reject: (reason: unknown) => unknown) {
      return Promise.resolve(handler({ ...state, filters: [...state.filters] })).catch(reject);
    },
  };
  return builder;
}

export function createSupabaseMock(handler: Handler = () => ({ data: null, error: null })) {
  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => createBuilder(table, handler)),
      auth: {
        getUser: vi.fn(),
        admin: {
          createUser: vi.fn(),
          getUserById: vi.fn(),
        },
      },
    },
    supabaseAnon: {
      auth: {
        signInWithPassword: vi.fn(),
      },
    },
    supabaseFor: vi.fn(),
  };
}
