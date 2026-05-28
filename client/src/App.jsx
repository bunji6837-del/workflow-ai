import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./components/LoginPage";
import AppShell from "./layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import ProjectChatPage from "./pages/ProjectChatPage";
import TeamPage from "./pages/TeamPage";
import ProfilePage from "./pages/ProfilePage";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="rounded-3xl bg-white/10 px-6 py-4 text-sm font-black">
        WorkFlow AI 불러오는 중...
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);

      if (window.location.hash.startsWith("#access_token") || window.location.hash.startsWith("#error")) {
        window.setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }, 300);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        <Route element={session ? <AppShell session={session} /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/chat" element={<ProjectChatPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}