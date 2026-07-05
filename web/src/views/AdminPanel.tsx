import { useState } from "react";
import * as api from "../api";
import { ApiError } from "../api";

interface Props {
  token: string;
  onReset: () => void;
}

export function AdminPanel({ token, onReset }: Props) {
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    setSubmitting(true);
    setError(null);
    try {
      await api.adminReset(token, password);
      onReset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card admin-panel">
      <h3>Reset</h3>
      <p className="muted">
        This clears everyone's registration and, once 8 people register again, picks a new umpire
        (never Jude, and never the same person who was umpire last time).
      </p>
      <label>
        Admin password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      {!confirming ? (
        <button onClick={() => setConfirming(true)} disabled={!password}>
          Reset
        </button>
      ) : (
        <div className="confirm-row">
          <p>Are you sure? This can't be undone.</p>
          <button onClick={handleReset} disabled={submitting}>
            {submitting ? "Resetting…" : "Yes, reset"}
          </button>
          <button className="link" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
