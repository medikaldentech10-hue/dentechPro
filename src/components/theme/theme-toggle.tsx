"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const modes = [
  { value: "light", label: "Açık tema", icon: Sun },
  { value: "dark", label: "Koyu tema", icon: Moon },
  { value: "system", label: "Sistem teması", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Tema seçimi"
        title="Tema seçimi"
        suppressHydrationWarning
      >
        <Laptop />
      </Button>
    );
  }

  const currentTheme = theme ?? "system";
  const currentIndex = modes.findIndex((mode) => mode.value === currentTheme);
  const nextMode = modes[(currentIndex + 1 + modes.length) % modes.length];
  const Icon = nextMode.icon;

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={nextMode.label}
      title={nextMode.label}
      onClick={() => setTheme(nextMode.value)}
      suppressHydrationWarning
    >
      <Icon />
    </Button>
  );
}

function useMounted() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setTimeout(onStoreChange, 0);
      return () => window.clearTimeout(id);
    },
    () => true,
    () => false
  );
}
