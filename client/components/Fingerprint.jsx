import { useEffect, useRef, useState } from "react";
import fingerprintSvg from "../assets/lockscreen/fingerprint.svg?raw";

const PATH = fingerprintSvg.match(/ d="([^"]+)"/)[1];
const HOLD_MS = 900;
// ridge core of the print
const CORE = { x: 60, y: 75 };

export default function Fingerprint({ onComplete }) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  function start() {
    if (pressed) return;
    setPressed(true);
    timer.current = setTimeout(onComplete, HOLD_MS);
  }

  function stop() {
    clearTimeout(timer.current);
    setPressed(false);
  }

  return (
    <button
      type="button"
      aria-label="Hold to enter"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && start()}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="touch-none select-none rounded-full p-4 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:outline focus-visible:outline-1 focus-visible:outline-carbon-500"
    >
      <svg viewBox="0 0 120 120" className="h-24 w-24">
        <defs>
          <mask id="fingerprint-fill">
            <circle
              cx={CORE.x}
              cy={CORE.y}
              r="90"
              fill="white"
              style={{
                transform: `scale(${pressed ? 1 : 0})`,
                transformOrigin: `${CORE.x}px ${CORE.y}px`,
                transition: pressed
                  ? `transform ${HOLD_MS}ms linear`
                  : "transform 300ms ease-out",
              }}
            />
          </mask>
        </defs>
        <path d={PATH} fill="white" />
        <path d={PATH} fill="#D80027" mask="url(#fingerprint-fill)" />
      </svg>
    </button>
  );
}
