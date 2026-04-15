import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Load the AIF subscribe widget (hydrates any .aif-subscribe-btn on share pages).
const backend = import.meta.env.VITE_API_URL ?? "";
if (backend) {
  const s = document.createElement("script");
  s.src = `${backend}/widget/aif-widget.js`;
  s.async = true;
  document.head.appendChild(s);
}

// Register web+aif:// as a protocol handler pointing at /subscribe.
try {
  navigator.registerProtocolHandler?.("web+aif", `${location.origin}/subscribe?feed=%s`);
} catch {
  // Some browsers restrict this; safe to ignore.
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
