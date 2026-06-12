"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminRequestWhatsAppActionsProps = {
  message: string;
};

export function AdminRequestCopyButton({
  message,
}: AdminRequestWhatsAppActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button onClick={copyMessage} type="button" variant="outline">
      <Copy data-icon="inline-start" />
      {copied ? "Kopyalandı" : "Mesajı Kopyala"}
    </Button>
  );
}
