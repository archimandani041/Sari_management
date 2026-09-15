import * as React from "react";
import { cn } from "../../lib/utils";

// Skeleton shimmer component for loading states
const Skeleton = ({ className, ...props }) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%] animate-shimmer",
      className
    )}
    {...props}
  />
);

export { Skeleton };
