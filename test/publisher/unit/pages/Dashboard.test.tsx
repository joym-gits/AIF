import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "../../../../publisher/src/pages/Dashboard";

vi.mock("../../../../publisher/src/lib/api", () => ({
  api: vi.fn((path: string) => {
    if (path === "/api/v1/feeds?sort=new") {
      return Promise.resolve({
        feeds: [{ id: "feed-1", title: "Publisher Feed", description: "Owned feed", subscriber_count: 3 }],
      });
    }
    return Promise.resolve({ total: 7 });
  }),
}));

describe("Dashboard", () => {
  it("renders dashboard totals and owned feeds", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Publisher Feed")).toBeInTheDocument();
    expect(screen.getByText("Total feeds")).toBeInTheDocument();
    expect(screen.getByText("Items published")).toBeInTheDocument();
  });
});
