import React from 'react';
import * as Progress from '@radix-ui/react-progress';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  variant?: 'spinner' | 'skeleton' | 'progress';
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  variant = 'skeleton',
  size = 'medium',
  text = 'Loading...' 
}) => {
  // Size mappings
  const sizeClasses = {
    small: {
      container: 'max-w-xs',
      spinner: 'h-4 w-4',
      progress: 'w-[200px] h-1.5',
      chartHeight: 'h-[120px]',
      barWidth: 'w-4',
      gap: 'space-x-2'
    },
    medium: {
      container: 'max-w-md',
      spinner: 'h-6 w-6',
      progress: 'w-[300px] h-2',
      chartHeight: 'h-[200px]',
      barWidth: 'w-6',
      gap: 'space-x-4'
    },
    large: {
      container: 'max-w-lg',
      spinner: 'h-8 w-8',
      progress: 'w-[400px] h-3',
      chartHeight: 'h-[280px]',
      barWidth: 'w-8',
      gap: 'space-x-6'
    }
  };

  // Spinner loading indicator
  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className={`${sizeClasses[size].spinner} text-blue-600 dark:text-blue-500 animate-spin`} />
        {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
      </div>
    );
  }

  // Progress bar loading indicator
  if (variant === 'progress') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-3">
        <Progress.Root 
          className={`relative overflow-hidden bg-blue-100 dark:bg-blue-900/30 rounded-full ${sizeClasses[size].progress}`}
        >
          <Progress.Indicator
            className="bg-blue-600 dark:bg-blue-500 w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)] animate-progress"
            style={{ transform: 'translateX(-100%)' }}
          />
        </Progress.Root>
        {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
      </div>
    );
  }

  // Skeleton loading indicator (default) - Bar chart style
  return (
    <div className={`w-full ${sizeClasses[size].container} mx-auto p-6`}>
      <div className="space-y-6">
        {/* Chart title and legend placeholder */}
        <div className="flex justify-between items-center">
          <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Y-axis and bars */}
        <div className="flex">
          {/* Y-axis labels */}
          <div className="pr-2 space-y-6 flex flex-col justify-between">
            <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          
          {/* Bars */}
          <div className="flex-1">
            <div className={`flex items-end ${sizeClasses[size].chartHeight} ${sizeClasses[size].gap}`}>
              <div className="w-full flex items-end justify-around">
                <div style={{ height: '30%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '60%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '45%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '80%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '25%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '65%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
                <div style={{ height: '40%' }} className={`${sizeClasses[size].barWidth} bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse`}></div>
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="flex justify-around pt-2">
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Optional summary stats */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};