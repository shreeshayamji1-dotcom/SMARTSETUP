import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

function isBenignResizeObserverError(message = "") {
  return /ResizeObserver loop completed with undelivered notifications|ResizeObserver loop limit exceeded/i.test(
    String(message),
  );
}

window.addEventListener(
  "error",
  (event) => {
    if (isBenignResizeObserverError(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  },
  true,
);

window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason?.message || event.reason || "";
  if (isBenignResizeObserverError(message)) {
    event.preventDefault();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
