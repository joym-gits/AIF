import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import AllItems from "./pages/AllItems";
import Discover from "./pages/Discover";
import FeedPage from "./pages/FeedPage";
import Login from "./pages/Login";
import Registry from "./pages/Registry";
import Subscribe from "./pages/Subscribe";
import SharedItemPage from "./pages/SharedItem";
import Notifications from "./pages/Notifications";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/items/:id" element={<SharedItemPage />} />
            <Route element={<Layout />}>
              <Route index element={<AllItems />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/feeds/:id" element={<FeedPage />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
