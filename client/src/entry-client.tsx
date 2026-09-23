import { hydrateRoot } from "react-dom/client";
import { hydrate } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { createAppQueryClient, queryClient } from "./lib/queryClient";
import { logRocketService } from "./lib/logrocket";
import { gtagService } from "./lib/gtag";

logRocketService.init();
gtagService.init();

const dehydratedState = window.__REACT_QUERY_STATE__;
let client = queryClient;
if (dehydratedState) {
  client = createAppQueryClient();
  hydrate(client, dehydratedState);
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

hydrateRoot(root, <App queryClient={client} />);
