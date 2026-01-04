import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Card variants for the unified HSSE design system
 */
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground",
  {
    variants: {
      variant: {
        /** Default card with shadow */
        default: "shadow-sm",
        /** Summary card - action-oriented, slightly elevated */
        summary: "shadow-sm p-4",
        /** Clickable action card with hover effect */
        action: "shadow-sm hover:shadow-md transition-shadow cursor-pointer",
        /** Alert/attention card with stronger border */
        alert: "border-2 shadow-sm",
        /** Flat card - minimal styling */
        flat: "border shadow-none",
        /** KPI card - centered content */
        kpi: "shadow-sm text-center",
        /** Ghost card - no border or shadow */
        ghost: "border-0 shadow-none bg-transparent",
      },
      status: {
        /** No status color */
        none: "",
        /** Informational - soft blue tint */
        informational: "bg-info/5 border-info/20",
        /** Pending - soft orange tint */
        pending: "bg-warning/5 border-warning/20",
        /** Critical - soft red tint */
        critical: "bg-destructive/5 border-destructive/20",
        /** Completed - soft green tint */
        completed: "bg-success/5 border-success/20",
      },
    },
    defaultVariants: {
      variant: "default",
      status: "none",
    },
  }
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, status, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, status, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
