import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/** Shown for PWA installation trigger and instructions. */
export function InstallPrompt() {
  const { t } = useTranslation();
  const { canInstall, installed, promptInstall } = usePwaInstall();

  if (installed) return null;

  const handleInstallClick = () => {
    if (canInstall) {
      void promptInstall();
    } else {
      // Fallback instructions if native beforeinstallprompt hasn't fired yet
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
      const msg = isMac
        ? "To install Kisan Sahayak PWA:\n• Click the Share / Install icon in your Safari or Chrome address bar.\n• Choose 'Add to Dock' or 'Install'."
        : "To install Kisan Sahayak PWA:\n1. Click the 3 dots (⋮) or Install icon at the top right of Chrome/Edge address bar.\n2. Select 'Install Kisan Sahayak' or 'Save and share' -> 'Install page as app'.";
      alert(msg);
    }
  };

  return (
    <Button
      onClick={handleInstallClick}
      size="lg"
      variant="secondary"
      className="h-12 w-full gap-2 sm:w-auto"
      title="Install Kisan Sahayak Application"
    >
      <Download className="size-4" aria-hidden="true" />
      {t("actions.install", "Install App")}
    </Button>
  );
}
