import React from "react";

interface WorkerInfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  dir?: string;
}

export function WorkerInfoRow({ icon: Icon, label, value, mono, dir }: WorkerInfoRowProps) {
  return (
    <div>
      <span className="text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <p className={`mt-0.5 font-medium ${mono ? "font-mono text-xs" : ""}`} dir={dir}>
        {value}
      </p>
    </div>
  );
}
