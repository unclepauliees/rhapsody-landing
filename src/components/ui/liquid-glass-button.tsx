"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Adapted from the supplied 21st.dev Liquid Glass Button. Each surface owns
// its filter ID so multiple instances cannot collide.
export function LiquidGlassSurface() {
  const id = `glass-${React.useId().replace(/:/g, "")}`;
  return (
    <>
      <span aria-hidden="true" className="liquid-glass-refraction" style={{ backdropFilter: `url("#${id}") blur(2px)` }} />
      <span aria-hidden="true" className="liquid-glass-bevel" />
      <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute" focusable="false">
        <defs>
          <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
            <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
            <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="4" />
          </filter>
        </defs>
      </svg>
    </>
  );
}

export const liquidbuttonVariants = cva(
  "relative isolate inline-flex items-center justify-center gap-2 rounded-md px-6 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transition-shadow",
  { variants: { size: { default: "h-11", lg: "h-14" } }, defaultVariants: { size: "default" } },
);

export function LiquidButton({ children, className, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof liquidbuttonVariants> & { asChild?: boolean }) {
  const content = (inner: React.ReactNode) => <><LiquidGlassSurface /><span className="relative z-10 inline-flex items-center gap-2">{inner}</span></>;
  // Radix Slot needs one element; insert the layers inside the anchor rather
  // than passing multiple children to Slot as the supplied demo does.
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{children: React.ReactNode}>;
    return <Slot className={cn(liquidbuttonVariants({size, className}))} {...props}>{React.cloneElement(child, {}, content(child.props.children))}</Slot>;
  }
  return <button className={cn(liquidbuttonVariants({size, className}))} {...props}>{content(children)}</button>;
}
