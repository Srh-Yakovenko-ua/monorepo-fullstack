import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  ariaLabel: string;
  toastMessage: string;
  value: string;
};

export function CopyButton({ ariaLabel, toastMessage, value }: CopyButtonProps) {
  function handleClick() {
    void navigator.clipboard.writeText(value).then(() => {
      toast.success(toastMessage);
    });
  }

  return (
    <Button
      aria-label={ariaLabel}
      className="text-muted-foreground/70 opacity-0 group-hover/row:opacity-100 hover:text-primary focus-visible:opacity-100"
      onClick={handleClick}
      size="icon-xs"
      variant="ghost"
    >
      <Copy />
    </Button>
  );
}
