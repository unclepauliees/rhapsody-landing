export function FirstLightArc() {
  return (
    <div className="first-light-arc" aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <circle
          cx="50"
          cy="255"
          r="180"
          fill="none"
          stroke="var(--signal)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
