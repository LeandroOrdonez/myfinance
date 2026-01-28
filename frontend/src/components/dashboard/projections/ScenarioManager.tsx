import React, { useState, useEffect } from 'react';
import { AlertCircle, Edit, Plus, Trash2, RefreshCw, X } from 'lucide-react';
import { ProjectionScenario, ProjectionParameter, ProjectionParameterCreate } from '../../../types/projections';
import { createScenario, updateScenario, deleteScenario, calculateProjection, recomputeBaseScenario } from '../../../services/projectionService';
import { ScenarioFormDialog, DeleteConfirmDialog } from './dialogs';

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
  const [isRecomputing, setIsRecomputing] = useState(false);
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
      setIsCreateDialogOpen(false);
      onScenariosChange();
      showNotification('success', 'Success', 'Scenario created successfully');
    } catch (error) {
      console.error('Error creating scenario:', error);
      showNotification('error', 'Error', 'Failed to create scenario');
    }
  };

  // Handle update scenario
  const handleUpdateScenario = async () => {
    try {
      if (!selectedScenario) return;
      await updateScenario(selectedScenario.id, formData);
      setIsEditDialogOpen(false);
      onScenariosChange();
      showNotification('success', 'Success', 'Scenario updated successfully');
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
      onScenariosChange();
      showNotification('success', 'Projection Calculated', 'The projection has been calculated successfully.');
    } catch (error) {
      showNotification('error', 'Calculation Failed', `Failed to calculate projection: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCalculating(null);
    }
  };

  // Handle recompute base scenario parameters
  const handleRecomputeBaseScenario = async () => {
    try {
      setIsRecomputing(true);
      const result = await recomputeBaseScenario();
      onScenariosChange();
      showNotification('success', 'Parameters Updated', `Base scenario parameters have been updated with the latest financial data.`);
    } catch (error) {
      showNotification('error', 'Recomputation Failed', `Failed to recompute base scenario parameters: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRecomputing(false);
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
                  {scenario.is_base_scenario && (
                    <button 
                      onClick={handleRecomputeBaseScenario}
                      className="px-2 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded transition-colors flex items-center"
                      disabled={isRecomputing}
                      title="Recompute parameters using latest financial data"
                    >
                      {isRecomputing ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          <span>Update</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Scenario Dialog */}
      <ScenarioFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Create New Scenario"
        description="Create a new projection scenario with custom parameters."
        formData={formData}
        onInputChange={handleInputChange}
        onSwitchChange={handleSwitchChange}
        onParametersChange={handleParametersChange}
        onSubmit={handleCreateScenario}
        submitLabel="Create Scenario"
      />

      {/* Edit Scenario Dialog */}
      <ScenarioFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="Edit Scenario"
        description="Modify this projection scenario's details and parameters."
        formData={formData}
        onInputChange={handleInputChange}
        onSwitchChange={handleSwitchChange}
        onParametersChange={handleParametersChange}
        onSubmit={handleUpdateScenario}
        submitLabel="Update Scenario"
        idPrefix="edit-"
      />

      {/* Delete Scenario Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        scenario={selectedScenario}
        onConfirm={handleDeleteScenario}
      />
    </div>
  );
};

export default ScenarioManager;
