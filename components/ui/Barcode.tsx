import React from 'react';

/**
 * Deterministic pseudo-barcode SVG representation based on string hash.
 * Creates clean, sharp vertical bars for print and display.
 */
export function Barcode({
  value,
  height = 40,
  showValue = true,
  className = '',
}: {
  value: string;
  height?: number;
  showValue?: boolean;
  className?: string;
}) {
  // Generate deterministic bar widths from characters
  const bars: { width: number; space: number }[] = [];
  const safeVal = value || 'MED-0000';

  for (let i = 0; i < safeVal.length; i++) {
    const code = safeVal.charCodeAt(i);
    bars.push({
      width: (code % 3) + 1.5,
      space: ((code >> 2) % 2) + 1.5,
    });
  }

  // Calculate total width
  let currentX = 10;
  const rects: Array<{ x: number; width: number }> = [];

  // Start guard bar
  rects.push({ x: currentX, width: 2 });
  currentX += 4;
  rects.push({ x: currentX, width: 2 });
  currentX += 5;

  for (const b of bars) {
    rects.push({ x: currentX, width: b.width });
    currentX += b.width + b.space;
  }

  // End guard bar
  rects.push({ x: currentX, width: 2 });
  currentX += 4;
  rects.push({ x: currentX, width: 2 });
  currentX += 10;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${currentX} ${height}`}
        className="w-full h-auto max-w-[240px]"
        preserveAspectRatio="none"
      >
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={0}
            width={r.width}
            height={height}
            fill="#0f172a"
          />
        ))}
      </svg>
      {showValue && (
        <span className="text-[11px] font-mono tracking-widest text-slate-700 mt-1 font-semibold uppercase">
          {safeVal}
        </span>
      )}
    </div>
  );
}
