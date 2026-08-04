import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useHydrated } from "@/hooks/useHydrated";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Small online/offline indicator for the header. */
export function ConnectionPill() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const hydrated = useHydrated();

  if (!hydrated) return null;

  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <span
      aria-label={t("a11y.connectionStatus")}
      className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${
        isOnline ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {isOnline ? t("status.online") : t("status.offline")}
    </span>
  );
}
