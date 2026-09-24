import { WifiSlashIcon } from "@phosphor-icons/react";
import { useOnline } from "../lib/save";
import { COPY } from "../lib/copy";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-sm font-bold text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      <WifiSlashIcon size={18} aria-hidden="true" />
      {COPY.offline}
    </div>
  );
}
