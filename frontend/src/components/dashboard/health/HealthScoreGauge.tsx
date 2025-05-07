import React from 'react';

interface HealthScoreGaugeProps {
  score: number;
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score }) => {
  // Calculate the rotation angle based on the score (0-100)
  // 0 = -90 degrees, 100 = 90 degrees
  const rotation = -90 + (score / 100) * 180;
  
  // Determine color based on score
  const getColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-green-400';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Get score description
  const getScoreDescription = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <h3 className="text-lg font-medium mb-2">Overall Financial Health</h3>
      
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Gauge background */}
        <div className="absolute w-48 h-48 rounded-full border-8 border-gray-200 top-0"></div>
        
        {/* Gauge colored sections */}
        <div className="absolute w-48 h-48 rounded-full border-0 top-0 overflow-hidden">
          <div className="absolute w-48 h-24 bg-red-500 top-24"></div>
          <div className="absolute w-48 h-24 bg-orange-500 top-24 origin-bottom rotate-36"></div>
          <div className="absolute w-48 h-24 bg-yellow-500 top-24 origin-bottom rotate-72"></div>
          <div className="absolute w-48 h-24 bg-green-400 top-24 origin-bottom rotate-108"></div>
          <div className="absolute w-48 h-24 bg-green-500 top-24 origin-bottom rotate-144"></div>
        </div>
        
        {/* Gauge needle */}
        <div 
          className="absolute w-1 h-24 bg-gray-800 top-0 left-24 origin-bottom"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-3 h-3 rounded-full bg-gray-800 relative -left-1"></div>
        </div>
        
        {/* Gauge center */}
        <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-gray-800 top-[90px] left-[81px]"></div>
      </div>
      
      {/* Score display */}
      <div className="text-center mt-2">
        <div className={`text-3xl font-bold ${getColor()}`}>
          {Math.round(score)}
        </div>
        <div className={`text-sm font-medium ${getColor()}`}>
          {getScoreDescription()}
        </div>
      </div>
    </div>
  );
};

export default HealthScoreGauge;
