import { useState } from "react";
import type { Position } from "../api";
import * as api from "../api";
import { ApiError } from "../api";

interface Props {
  token: string;
  positions: Position[];
  isUmpire: boolean;
  onUpdate: (positions: Position[]) => void;
}

export function SwappablePositionsList({ token, positions, isUmpire, onUpdate }: Props) {
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [overName, setOverName] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDrop(targetName: string) {
    if (!draggingName || draggingName === targetName || swapping) return;
    setSwapping(true);
    setError(null);
    try {
      const res = await api.swapPositions(token, draggingName, targetName);
      onUpdate(res.positions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Swap failed. Try again.");
    } finally {
      setSwapping(false);
      setDraggingName(null);
      setOverName(null);
    }
  }

  if (!isUmpire) {
    return (
      <ol className="positions">
        {positions.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ol>
    );
  }

  return (
    <div>
      <p className="muted swap-hint">Drag to swap positions.</p>
      {error && <p className="error">{error}</p>}
      <ol className="positions swap-list">
        {positions.map((p) => (
          <li
            key={p.name}
            className={[
              "swap-item",
              draggingName === p.name ? "dragging" : "",
              overName === p.name && draggingName !== p.name ? "drag-over" : "",
              swapping ? "swapping" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            draggable={!swapping}
            onDragStart={() => setDraggingName(p.name)}
            onDragEnd={() => {
              setDraggingName(null);
              setOverName(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggingName !== p.name) setOverName(p.name);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverName(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(p.name);
            }}
          >
            {p.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
