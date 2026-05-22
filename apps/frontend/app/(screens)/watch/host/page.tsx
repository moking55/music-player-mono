import { Suspense } from "react";
import HostContainer from "@/containers/watch/host-container";
import "server-only";

export default function WatchHostPage() {
  return (
    <Suspense>
      <HostContainer />
    </Suspense>
  );
}
