import React from "react";
import { Sprout } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border/60 bg-background text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          
          {/* Brand & Copyright */}
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              © {currentYear} <strong className="font-semibold text-foreground">AgriAI</strong> · Empowering farmers with AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex gap-4">
            <a 
              href="#privacy" 
              className="transition-colors hover:text-foreground focus:outline-none focus:underline"
            >
              Privacy
            </a>
            <a 
              href="#terms" 
              className="transition-colors hover:text-foreground focus:outline-none focus:underline"
            >
              Terms
            </a>
            <a 
              href="#support" 
              className="transition-colors hover:text-foreground focus:outline-none focus:underline"
            >
              Support
            </a>
          </nav>

        </div>
      </div>
    </footer>
  );
}