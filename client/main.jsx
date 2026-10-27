import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PasscodeGate from "./components/PasscodeGate";
import "./index.css";
import { startAnimatedFavicon } from "./utils/animatedFavicon";

startAnimatedFavicon();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PasscodeGate>
      <App />
    </PasscodeGate>
  </React.StrictMode>,
);
