import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n before App

createRoot(document.getElementById("root")!).render(<App />);
