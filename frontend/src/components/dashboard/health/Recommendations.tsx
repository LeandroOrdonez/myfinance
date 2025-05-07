import React, { useState } from 'react';
import { format } from 'date-fns';

interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  impact_area: string;
  priority: number;
  estimated_score_improvement: number;
  is_completed: boolean;
  date_completed: string | null;
  date_created: string;
}

interface RecommendationsProps {
  recommendations: Recommendation[];
  onUpdate: (id: number, isCompleted: boolean) => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({ recommendations, onUpdate }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2 dark:text-white">Personalized Recommendations</h3>
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500 dark:text-gray-400">No recommendations available</p>
        </div>
      </div>
    );
  }

  // Get priority color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-100 text-red-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return 'Highest';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      default: return 'Lowest';
    }
  };

  // Toggle expanded state
  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3 dark:text-white">Personalized Recommendations</h3>
      
      <div className="space-y-3">
        {recommendations.map(recommendation => (
          <div 
            key={recommendation.id} 
            className={`border rounded-lg overflow-hidden ${recommendation.is_completed ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
          >
            <div 
              className="p-3 cursor-pointer flex items-center justify-between"
              onClick={() => toggleExpanded(recommendation.id)}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={recommendation.is_completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdate(recommendation.id, e.target.checked);
                  }}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <div className={recommendation.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white'}>
                  {recommendation.title}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(recommendation.priority)}`}>
                  {getPriorityLabel(recommendation.priority)}
                </span>
                <button className="text-gray-500 dark:text-gray-400">
                  {expandedId === recommendation.id ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {expandedId === recommendation.id && (
              <div className="px-3 pb-3 pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{recommendation.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium dark:text-gray-300">Impact Area:</span> {recommendation.impact_area}
                  </div>
                  <div>
                    <span className="font-medium dark:text-gray-300">Potential Improvement:</span> +{recommendation.estimated_score_improvement} points
                  </div>
                  <div>
                    <span className="font-medium dark:text-gray-300">Created:</span> {format(new Date(recommendation.date_created), 'MMM d, yyyy')}
                  </div>
                  {recommendation.is_completed && recommendation.date_completed && (
                    <div>
                      <span className="font-medium dark:text-gray-300">Completed:</span> {format(new Date(recommendation.date_completed), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
