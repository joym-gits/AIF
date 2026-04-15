import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Protected from "./components/Protected";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewFeed from "./pages/NewFeed";
import FeedDetail from "./pages/FeedDetail";
import ProfilePage from "./pages/Profile";
import Discover from "./pages/Discover";
import Docs from "./pages/Docs";
import Landing from "./pages/Landing";

function Root() {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  return session ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/feeds/new" element={<Protected><NewFeed /></Protected>} />
            <Route path="/feeds/:id" element={<Protected><FeedDetail /></Protected>} />
            <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:slug" element={<Docs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
