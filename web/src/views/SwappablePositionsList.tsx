import { useState } from "react";
import type { CollectionStatus, Position } from "../api";
import * as api from "../api";
import { ApiError } from "../api";

interface Props {
  token: string;
  positions: Position[];
  canEdit: boolean;
  onUpdate: (positions: Position[]) => void;
}

const STATUS_LABEL: Record<CollectionStatus, string> = {
  waiting: "Waiting",
  next: "Next",
  collected: "Collected",
};

export function SwappablePositionsList({ token, positions, canEdit, onUpdate }: Props) {
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [overName, setOverName] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDrop(targetName: string) {
    if (!draggingName || draggingName === targetName || swapping || updatingStatus) return;
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

  async function handleStatusChange(name: string, status: CollectionStatus) {
    setUpdatingStatus(name);
    setError(null);
    try {
      const res = await api.setCollectionStatus(token, name, status);
      onUpdate(res.positions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status update failed.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (!canEdit) {
    return (
      <ol className="swap-list">
        {positions.map((p) => {
          const st = (p.collectionStatus ?? "waiting") as CollectionStatus;
          return (
            <li key={p.name} className="swap-item readonly-item">
              <span className="swap-name">{p.name}</span>
              <span className={`status-badge status-${st}`}>{STATUS_LABEL[st]}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  const busy = swapping || !!updatingStatus;

  return (
    <div>
      <p className="muted swap-hint">Drag to swap positions · Dropdown to track collection.</p>
      {error && <p className="error">{error}</p>}
      <ol className="swap-list">
        {positions.map((p) => {
          const st = (p.collectionStatus ?? "waiting") as CollectionStatus;
          return (
            <li
              key={p.name}
              className={[
                "swap-item",
                draggingName === p.name ? "dragging" : "",
                overName === p.name && draggingName !== p.name ? "drag-over" : "",
                busy ? "swapping" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!busy}
              onDragStart={(e) => {
                if ((e.target as HTMLElement).tagName === "SELECT") {
                  e.preventDefault();
                  return;
                }
                setDraggingName(p.name);
              }}
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
              <span className="swap-name">{p.name}</span>
              <select
                className="status-select"
                data-status={st}
                value={st}
                disabled={busy}
                onChange={(e) => handleStatusChange(p.name, e.target.value as CollectionStatus)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="waiting">Waiting</option>
                <option value="next">Next</option>
                <option value="collected">Collected</option>
              </select>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
