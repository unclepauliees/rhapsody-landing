"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MilkyWay = dynamic(() => import("@/components/ui/milky-way"), {
  ssr: false,
});

type Theme = "dark" | "light";

// Below 768px the full WebGL scene blows the mobile Lighthouse performance
// budget (bootup time from three.js + the GPGPU particle build). The spec
// authorizes swapping in a static frame at that breakpoint instead of
// shipping the scene there at all.
function StaticFrame({ theme }: { theme: Theme }) {
  const isLight = theme === "light";
  return (
    <div
      className="h-full w-full"
      style={{
        background: isLight
          ? "radial-gradient(120% 90% at 30% 20%, var(--paper-deep), var(--paper))"
          : "radial-gradient(120% 90% at 30% 20%, var(--espresso-lifted), var(--espresso))",
      }}
    />
  );
}

export function MilkyWayBackground({ theme }: { theme: Theme }) {
  const isLight = theme === "light";
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="milky-way-layer">
      {isDesktop ? (
        <MilkyWay
          coreColor={isLight ? "#8b8474" : "#ece7da"}
          accentColor={isLight ? "#8b8474" : "#c93a1e"}
          outerColor="#3a2e24"
          backgroundColor={isLight ? "#ece7da" : "#2a211a"}
          mouseInfluence
          rotationSpeed={0.1}
        />
      ) : (
        <StaticFrame theme={theme} />
      )}
    </div>
  );
}
