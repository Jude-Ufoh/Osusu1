import { useEffect, useState } from "react";
import "./App.css";
import * as api from "./api";
import type { Member } from "./api";
import { RegisterView } from "./views/RegisterView";
import { LoginView } from "./views/LoginView";
import { HomeView } from "./views/HomeView";

interface Session {
  token: string;
  member: Member;
}

const SESSION_KEY = "osusu.session";

function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<"register" | "login">("login");

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  function handleLoggedIn(token: string, member: Member) {
    setSession({ token, member });
  }

  function handleLogout() {
    setSession(null);
  }

  if (session) {
    return <HomeView token={session.token} member={session.member} onLogout={handleLogout} />;
  }

  return (
    <div className="page">
      <h1>Rich People Osusu</h1>
      {view === "login" ? (
        <LoginView
          onLoggedIn={(res) => handleLoggedIn(res.token, res.member)}
          onSwitchToRegister={() => setView("register")}
        />
      ) : (
        <RegisterView onSwitchToLogin={() => setView("login")} registerFn={api.register} />
      )}
    </div>
  );
}
