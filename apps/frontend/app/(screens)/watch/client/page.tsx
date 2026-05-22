import { Suspense } from "react";
import ClientContainer from "@/containers/watch/client-container";
import "server-only";

export default function WatchClientPage() {
  return (
    <Suspense>
      <ClientContainer />
    </Suspense>
  );
}
