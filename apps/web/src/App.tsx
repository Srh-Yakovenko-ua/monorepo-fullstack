import { RouterProvider } from "react-router";

import { ModalsRoot } from "@/features/modals";
import { router } from "@/routes/router";

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ModalsRoot />
    </>
  );
}
