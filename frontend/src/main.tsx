import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/styles.css";
import { preloadDinoSpritesheets } from "@/field/useDinoSpritesheet";

// Start downloading dino sprites immediately on any page load so they're in
// the HTTP cache before FieldStage or LandingDino need them.
preloadDinoSpritesheets();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
