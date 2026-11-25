import React from 'react';
import { getScoreTextColor, getScoreDescription } from './scoreStyles';

interface HealthScoreGaugeProps {
  score: number;
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score }) => {
  // Calculate the rotation angle based on the score (0-100)
  // 0 = -90 degrees, 100 = 90 degrees
  const rotation = -90 + (score / 100) * 180;
  const description = getScoreDescription(score);

  // Tailwind has no rotate-36/72/108/144 utilities; apply them inline.
  const segments = [
    { angle: 0, className: 'bg-red-500' },
    { angle: 36, className: 'bg-orange-500' },
    { angle: 72, className: 'bg-yellow-500' },
    { angle: 108, className: 'bg-green-400' },
    { angle: 144, className: 'bg-green-500' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-48 h-24 overflow-hidden"
        role="img"
        aria-label={`Financial health score gauge: ${Math.round(score)} out of 100, ${description}`}
      >
        {/* Gauge background */}
        <div className="absolute w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 top-0"></div>

        {/* Gauge colored sections */}
        <div className="absolute w-48 h-48 rounded-full border-0 top-0 overflow-hidden">
          {segments.map(({ angle, className }) => (
            <div
              key={angle}
              className={`absolute w-48 h-24 ${className} top-24 origin-bottom`}
              style={{ transform: `rotate(${angle}deg)` }}
            ></div>
          ))}
        </div>

        {/* Gauge needle */}
        <div
          className="absolute w-1 h-24 bg-gray-800 dark:bg-gray-200 top-0 left-24 origin-bottom"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-3 h-3 rounded-full bg-gray-800 dark:bg-gray-200 relative -left-1"></div>
        </div>

        {/* Gauge center */}
        <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-gray-800 dark:border-gray-200 top-[90px] left-[81px]"></div>
      </div>

      {/* Score display */}
      <div className="text-center mt-2" aria-live="polite">
        <div className={`text-4xl font-bold mt-4 ${getScoreTextColor(score)}`}>
          {Math.round(score)}
          <span className="text-lg font-normal text-[var(--color-text-muted)]">/100</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {description}
        </div>
      </div>
    </div>
  );
};

export default HealthScoreGauge;
