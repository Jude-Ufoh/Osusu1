import { useEffect, useState } from "react";
import type { Position } from "../api";

interface Props {
  positions: Position[];
  onDone: () => void;
}

const DELAY_S = 10;

export function AssignmentReveal({ positions, onDone }: Props) {
  // First position is shown immediately; subsequent ones reveal every DELAY_S seconds
  const [revealed, setRevealed] = useState(1);
  const [countdown, setCountdown] = useState(DELAY_S);
  const allDone = revealed >= positions.length;

  useEffect(() => {
    if (allDone) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setRevealed((r) => r + 1);
          return DELAY_S;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [allDone]);

  return (
    <div className="reveal-container">
      <h2 className="reveal-title">Draw in progress</h2>

      <ol className="reveal-list">
        {positions.map((p, i) => {
          const pos = i + 1;
          const isRevealed = pos <= revealed;
          const isNew = pos === revealed;
          const isCurrent = pos === revealed + 1 && !allDone;

          return (
            <li
              key={p.name}
              className={[
                "reveal-item",
                isRevealed ? "reveal-shown" : "",
                isNew ? "reveal-new" : "",
                isCurrent ? "reveal-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="reveal-pos">{pos}.</span>
              <span className="reveal-name">
                {isRevealed ? p.name : isCurrent ? "?" : "—"}
              </span>
            </li>
          );
        })}
      </ol>

      {!allDone ? (
        <p className="reveal-countdown muted">
          Revealing position {revealed + 1} in{" "}
          <strong>{countdown}s</strong>
        </p>
      ) : (
        <div className="reveal-done">
          <p className="success">All positions drawn!</p>
          <button onClick={onDone}>View assignment</button>
        </div>
      )}
    </div>
  );
}
