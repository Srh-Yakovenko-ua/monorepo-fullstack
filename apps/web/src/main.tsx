import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";

import { Toaster } from "@/components/ui/sonner";
import { installGlobalErrorHandlers } from "@/lib/error-handlers";
import { queryClient } from "@/lib/query-client";
import { reportWebVitals } from "@/lib/vitals";

import { App } from "./App";
import "./index.css";

if (__DEV__) {
  void import("react-scan").then(({ scan }) => {
    scan({ enabled: true, log: false });
  });
  void import("@axe-core/react").then((axe) => {
    void axe.default(React, ReactDOM, 1000);
  });
}

installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster closeButton richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);

reportWebVitals();
