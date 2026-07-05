import { useState } from "react";
import * as api from "../api";
import type { LoginResponse } from "../api";
import { ApiError } from "../api";

interface Props {
  onLoggedIn: (res: LoginResponse) => void;
  onSwitchToRegister: () => void;
}

export function LoginView({ onLoggedIn, onSwitchToRegister }: Props) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login(name.trim(), pin);
      onLoggedIn(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Log in</h2>
      <label>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </label>
      <label>
        4-digit PIN
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </button>
      <button type="button" className="link" onClick={onSwitchToRegister}>
        New here? Register
      </button>
    </form>
  );
}
