import React, { useState, useEffect } from 'react';
import { AlertCircle, Edit, Plus, Trash2, X } from 'lucide-react';
import { ProjectionScenario, ProjectionParameter, ProjectionParameterCreate } from '../../../types/projections';
import { createScenario, updateScenario, deleteScenario, calculateProjection } from '../../../services/projectionService';
import ParameterEditor from './ParameterEditor';

interface ScenarioManagerProps {
  scenarios: ProjectionScenario[];
  onScenariosChange: () => void;
  isLoading: boolean;
}

interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, onScenariosChange, isLoading }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ProjectionScenario | null>(null);
  const [notification, setNotification] = useState<NotificationProps | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    parameters: [] as ProjectionParameterCreate[]
  });
  
  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Show notification
  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ type, title, message });
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle switch toggle
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_default: checked }));
  };

  // Handle parameter changes
  const handleParametersChange = (parameters: ProjectionParameterCreate[]) => {
    setFormData(prev => ({ ...prev, parameters }));
  };

  // Open create dialog
  const openCreateDialog = () => {
    setFormData({
      name: '',
      description: '',
      is_default: false,
      parameters: [
        { param_name: 'income_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'essential_expenses_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'discretionary_expenses_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'investment_rate', param_value: 0.10, param_type: 'percentage' },
        { param_name: 'inflation_rate', param_value: 0.02, param_type: 'percentage' },
        { param_name: 'investment_return_rate', param_value: 0.07, param_type: 'percentage' },
        { param_name: 'emergency_fund_target', param_value: 6.0, param_type: 'months' },
        { param_name: 'holdings_market_value', param_value: 0.0, param_type: 'amount' }
      ]
    });
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (scenario: ProjectionScenario) => {
    setSelectedScenario(scenario);
    setFormData({
      name: scenario.name,
      description: scenario.description,
      is_default: scenario.is_default,
      parameters: scenario.parameters?.map((p: ProjectionParameter) => ({
        param_name: p.param_name,
        param_value: p.param_value,
        param_type: p.param_type
      })) || []
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (scenario: ProjectionScenario) => {
    setSelectedScenario(scenario);
    setIsDeleteDialogOpen(true);
  };

  // Handle create scenario
  const handleCreateScenario = async () => {
    try {
      await createScenario(formData);
      showNotification('success', 'Success', 'Scenario created successfully');
      setIsCreateDialogOpen(false);
      onScenariosChange();
    } catch (error) {
      console.error('Error creating scenario:', error);
      showNotification('error', 'Error', 'Failed to create scenario');
    }
  };

  // Handle update scenario
  const handleUpdateScenario = async () => {
    if (!selectedScenario) return;
    
    try {
      await updateScenario(selectedScenario.id, formData);
      showNotification('success', 'Success', 'Scenario updated successfully');
      setIsEditDialogOpen(false);
      onScenariosChange();
    } catch (error) {
      console.error('Error updating scenario:', error);
      showNotification('error', 'Error', 'Failed to update scenario');
    }
  };

  // Handle delete scenario
  const handleDeleteScenario = async () => {
    if (!selectedScenario) return;
    
    try {
      await deleteScenario(selectedScenario.id);
      showNotification('success', 'Success', 'Scenario deleted successfully');
      setIsDeleteDialogOpen(false);
      onScenariosChange();
    } catch (error) {
      console.error('Error deleting scenario:', error);
      showNotification('error', 'Error', 'Failed to delete scenario');
    }
  };

  // Handle calculate projection
  const handleCalculateProjection = async (scenarioId: number) => {
    try {
      setIsCalculating(scenarioId);
      await calculateProjection(scenarioId);
      showNotification('success', 'Success', 'Projection calculated successfully');
    } catch (error) {
      console.error('Error calculating projection:', error);
      showNotification('error', 'Error', 'Failed to calculate projection');
    } finally {
      setIsCalculating(null);
    }
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`p-4 rounded-md mb-4 ${notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <div>
              <p className="font-medium">{notification.title}</p>
              <p className="text-sm">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)} 
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Manage Projection Scenarios</h3>
        <button 
          onClick={openCreateDialog}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Scenario
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="mb-4">
                <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-end space-x-2">
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium">No scenarios found</h4>
              <p className="text-sm">
                Create a new scenario to get started with financial projections.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
              <div className="mb-4">
                <h4 className="text-lg font-medium">{scenario.name}</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {scenario.is_default && <span className="text-blue-500 text-xs font-medium mr-2">DEFAULT</span>}
                  Created: {new Date(scenario.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">{scenario.description}</p>
              </div>
              <div className="flex justify-between">
                <button 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border ${isCalculating === scenario.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  onClick={() => handleCalculateProjection(scenario.id)}
                  disabled={isCalculating === scenario.id}
                >
                  {isCalculating === scenario.id ? 'Calculating...' : 'Calculate'}
                </button>
                <div className="flex space-x-2">
                  <button 
                    className={`p-2 rounded-md border ${isCalculating === scenario.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={() => openEditDialog(scenario)}
                    disabled={isCalculating === scenario.id}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    className={`p-2 rounded-md border ${scenario.is_default || isCalculating === scenario.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={() => openDeleteDialog(scenario)}
                    disabled={scenario.is_default || isCalculating === scenario.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Scenario Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Create New Scenario</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create a new projection scenario with custom parameters.
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="is_default" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Default Scenario</label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => handleSwitchChange(e.target.checked)}
                        className="sr-only"
                      />
                      <div 
                        className={`w-11 h-6 rounded-full transition ${formData.is_default ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        onClick={() => handleSwitchChange(!formData.is_default)}
                      >
                        <div 
                          className={`transform transition-transform duration-200 ease-in-out h-5 w-5 rounded-full bg-white shadow-md ${formData.is_default ? 'translate-x-6' : 'translate-x-1'} mt-0.5`}
                        />
                      </div>
                    </div>
                    <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">Make this a default scenario</label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Parameters</label>
                  <ParameterEditor
                    parameters={formData.parameters}
                    onChange={handleParametersChange}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateScenario}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
                >
                  Create Scenario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Scenario Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Edit Scenario</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Modify this projection scenario's details and parameters.
                  </p>
                </div>
                <button 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-name" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-description" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-is_default" className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">Default Scenario</label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        id="edit-is_default"
                        checked={formData.is_default}
                        onChange={(e) => handleSwitchChange(e.target.checked)}
                        className="sr-only"
                      />
                      <div 
                        className={`w-11 h-6 rounded-full transition ${formData.is_default ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        onClick={() => handleSwitchChange(!formData.is_default)}
                      >
                        <div 
                          className={`transform transition-transform duration-200 ease-in-out h-5 w-5 rounded-full bg-white shadow-md ${formData.is_default ? 'translate-x-6' : 'translate-x-1'} mt-0.5`}
                        />
                      </div>
                    </div>
                    <label htmlFor="edit-is_default" className="text-sm text-gray-700 dark:text-gray-300">Make this a default scenario</label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Parameters</label>
                  <ParameterEditor
                    parameters={formData.parameters}
                    onChange={handleParametersChange}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateScenario}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
                >
                  Update Scenario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Scenario Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Delete Scenario</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this scenario? This action cannot be undone.
                  </p>
                </div>
                <button 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {selectedScenario && (
                <div className="py-4 space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedScenario.name}</p>
                  <p><span className="font-medium">Description:</span> {selectedScenario.description}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteScenario}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;
