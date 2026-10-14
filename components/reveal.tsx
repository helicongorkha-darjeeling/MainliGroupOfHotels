import type { ReactNode } from "react";
// Sections remain visible before hydration and without JavaScript.
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={className}>{children}</div>; }
