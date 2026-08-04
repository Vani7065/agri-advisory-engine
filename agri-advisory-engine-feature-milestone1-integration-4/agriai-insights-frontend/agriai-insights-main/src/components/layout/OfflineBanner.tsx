import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Sticky banner shown while the device is offline. Hides itself automatically
 * as soon as connectivity returns.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const isHydrated = useHydrated();

  if (!isHydrated) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("a11y.connectionStatus")}
      className={
        isOnline
          ? "sr-only"
          : "sticky top-0 z-50 flex w-full items-start gap-3 bg-destructive px-4 py-3 text-destructive-foreground shadow-md"
      }
    >
      {isOnline ? (
        t("status.online")
      ) : (
        <>
          <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="text-sm leading-snug sm:text-base">
            <p className="font-semibold">{t("offline.banner")}</p>
            <p className="opacity-90">{t("offline.hint")}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default OfflineBanner;
