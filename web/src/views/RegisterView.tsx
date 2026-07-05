import { useState } from "react";
import type { RegisterResponse } from "../api";
import { ApiError } from "../api";

interface Props {
  registerFn: (name: string, pin: string) => Promise<RegisterResponse>;
  onSwitchToLogin: () => void;
}

export function RegisterView({ registerFn, onSwitchToLogin }: Props) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerFn(name.trim(), pin);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="card">
        <p className="success">{result.message}</p>
        {result.note && <p>{result.note}</p>}
        <p className="muted">
          {result.registeredCount} of {result.groupSize} registered
        </p>
        <button onClick={onSwitchToLogin}>Go to login</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Register</h2>
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
        {submitting ? "Registering…" : "Register"}
      </button>
      <button type="button" className="link" onClick={onSwitchToLogin}>
        Already registered? Log in
      </button>
    </form>
  );
}
