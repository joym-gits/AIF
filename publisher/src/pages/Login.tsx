import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;
  return (
    <div className="max-w-sm mx-auto mt-20 bg-card p-6 rounded-lg border border-slate-800">
      <h1 className="text-xl font-semibold mb-4">Sign in to AIF Publisher</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: "#6366f1", brandAccent: "#4f46e5" } } } }}
        providers={[]}
        magicLink
        theme="dark"
      />
    </div>
  );
}
