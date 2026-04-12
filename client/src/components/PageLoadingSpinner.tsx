import { Loader2Icon } from "lucide-react";

export default function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2Icon className="size-8 animate-spin text-primary" />
    </div>
  );
}
