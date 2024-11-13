import React from 'react';
import * as Progress from '@radix-ui/react-progress';

export const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <Progress.Root className="relative overflow-hidden bg-blue-100 rounded-full w-[300px] h-2">
        <Progress.Indicator
          className="bg-blue-600 w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
          style={{ transform: 'translateX(-100%)' }}
        />
      </Progress.Root>
    </div>
  );
}; 