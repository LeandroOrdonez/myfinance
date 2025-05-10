import React, { useState, useMemo } from 'react';
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
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Extract unique years from recommendations
  const availableYears = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return [];
    
    const years = new Set<string>();
    recommendations.forEach(rec => {
      const year = new Date(rec.date_created).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [recommendations]);

  // Filter recommendations based on selected filters
  const filteredRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return [];
    
    return recommendations.filter(rec => {
      // Filter by priority if set
      if (priorityFilter !== null && rec.priority !== priorityFilter) {
        return false;
      }
      
      // Filter by year if set
      if (yearFilter !== null) {
        const recYear = new Date(rec.date_created).getFullYear().toString();
        if (recYear !== yearFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [recommendations, priorityFilter, yearFilter]);

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

  // Handle bulk completion
  const handleBulkComplete = () => {
    setShowConfirmation(true);
  };

  // Confirm bulk completion
  const confirmBulkComplete = () => {
    filteredRecommendations.forEach(rec => {
      if (!rec.is_completed) {
        onUpdate(rec.id, true);
      }
    });
    setShowConfirmation(false);
  };

  // Cancel bulk completion
  const cancelBulkComplete = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium dark:text-white">Personalized Recommendations</h3>
        
        <button
          onClick={handleBulkComplete}
          disabled={filteredRecommendations.every(r => r.is_completed) || filteredRecommendations.length === 0}
          className={`text-xs px-3 py-1 rounded ${filteredRecommendations.every(r => r.is_completed) || filteredRecommendations.length === 0 
            ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed' 
            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-700 dark:text-indigo-100 dark:hover:bg-indigo-600'}`}
        >
          Mark All as Complete
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select 
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
          value={priorityFilter === null ? '' : priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">All Priorities</option>
          <option value="5">Highest</option>
          <option value="4">High</option>
          <option value="3">Medium</option>
          <option value="2">Low</option>
          <option value="1">Lowest</option>
        </select>
        
        <select 
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
          value={yearFilter === null ? '' : yearFilter}
          onChange={(e) => setYearFilter(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">All Years</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        
        {(priorityFilter !== null || yearFilter !== null) && (
          <button 
            onClick={() => {
              setPriorityFilter(null);
              setYearFilter(null);
            }}
            className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-2 py-1 rounded flex items-center"
          >
            Clear Filters
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h4 className="text-lg font-medium mb-3 dark:text-white">Confirm Action</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to mark all {filteredRecommendations.filter(r => !r.is_completed).length} visible incomplete recommendations as completed?
            </p>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={cancelBulkComplete}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkComplete}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {filteredRecommendations.length === 0 ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500 dark:text-gray-400">No recommendations match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecommendations.map(recommendation => (
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
      )}
    </div>
  );
};

export default Recommendations;
