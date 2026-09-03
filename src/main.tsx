import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyStoredTheme } from '@/hooks/useTheme';

// Before first paint, or the default theme flashes on load
applyStoredTheme();
import { BibleService } from "./services/BibleService";

// Warm offline cache for the most-read passages.
void BibleService.preloadCommonBooks();

createRoot(document.getElementById("root")!).render(<App />);
