import type { ReactNode } from "react";

interface ScrollPaneProps {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}

export function ScrollPane({ children, className, narrow }: ScrollPaneProps) {
  const classes = ["page-scroll", narrow ? "page-scroll--narrow" : "", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}
