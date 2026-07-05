import { useCallback, useEffect, useState } from "react";
import * as api from "../api";
import type { Member, StatusResponse } from "../api";
import { ApiError } from "../api";
import { AdminPanel } from "./AdminPanel";

interface Props {
  token: string;
  member: Member;
  onLogout: () => void;
}

const POLL_MS = 6000;

export function HomeView({ token, member, onLogout }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getStatus(token);
      setStatus(res);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        onLogout();
      } else {
        setError("Couldn't reach the server. Retrying…");
      }
    }
  }, [token, onLogout]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleAssign() {
    setAssigning(true);
    setError(null);
    try {
      const res = await api.runAssignment(token);
      setStatus((prev) => (prev ? { ...prev, stage: "assigned", positions: res.positions } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="page">
      <div className="header-row">
        <h1>Osusu Group</h1>
        <button className="link" onClick={onLogout}>
          Log out
        </button>
      </div>
      <p className="muted">Welcome, {member.name}</p>

      <div className="card">
        {!status && !error && <p>Loading…</p>}
        {error && <p className="error">{error}</p>}

        {status?.stage === "waiting_for_registrations" && (
          <>
            <h2>Waiting for everyone to register</h2>
            <p>
              {status.registeredCount} of {status.groupSize} registered
            </p>
            <p>You will know your position when everyone has registered.</p>
          </>
        )}

        {status?.stage === "waiting_for_umpire" && (
          <>
            <h2>All 8 have registered</h2>
            <p>Waiting for the umpire to assign contribution positions.</p>
          </>
        )}

        {status?.stage === "you_are_umpire" && (
          <>
            <h2>You are the umpire</h2>
            <p>Tap below to randomly assign everyone's contribution position. This can only be done once.</p>
            <button onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assigning…" : "Run Assignment"}
            </button>
          </>
        )}

        {status?.stage === "assigned" && status.positions && (
          <>
            <h2>Contribution order</h2>
            <ol className="positions">
              {status.positions.map((p) => (
                <li key={p.name}>{p.name}</li>
              ))}
            </ol>
          </>
        )}
      </div>

      {member.isAdmin && (
        <div className="admin-entry">
          <button className="link" onClick={() => setShowAdmin((v) => !v)}>
            {showAdmin ? "Hide admin" : "Admin"}
          </button>
          {showAdmin && (
            <AdminPanel
              token={token}
              onReset={() => {
                setShowAdmin(false);
                onLogout();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
