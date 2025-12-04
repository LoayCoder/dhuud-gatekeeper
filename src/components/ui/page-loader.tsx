import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
