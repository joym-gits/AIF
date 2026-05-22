import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Discover from "../../../../reader/src/pages/Discover";

vi.mock("../../../../reader/src/lib/auth", () => ({
  useAuth: () => ({ session: null }),
}));

vi.mock("../../../../reader/src/lib/api", () => ({
  api: vi.fn().mockResolvedValue({
    feeds: [{ id: "feed-1", title: "AI Research", description: "Daily papers", domain: "research", subscriber_count: 10 }],
  }),
}));

describe("Discover", () => {
  it("renders feed discovery content", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <Discover />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("AI Research")).toBeInTheDocument();
    expect(screen.getByText("Find AI Intelligence Feeds")).toBeInTheDocument();
  });
});
