import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PasscodeGate from "./components/PasscodeGate";
import "./index.css";

// reload once when a newly deployed version takes over (not on first install)
if (navigator.serviceWorker?.controller) {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => location.reload(),
    { once: true },
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasscodeGate>
      <App />
    </PasscodeGate>
  </React.StrictMode>,
);
