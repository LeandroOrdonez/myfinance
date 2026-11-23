import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import { ProjectionScenario, ProjectionParameter, ProjectionParameterCreate } from '../../../types/projections';
import { createScenario, updateScenario, deleteScenario, calculateProjection, recomputeBaseScenario } from '../../../services/projectionService';
import { ScenarioFormDialog, DeleteConfirmDialog } from './dialogs';
import { HoldingsValueEditor } from './HoldingsValueEditor';
import { ScenarioCard } from './ScenarioCard';

interface ScenarioManagerProps {
  scenarios: ProjectionScenario[];
  onScenariosChange: () => void;
  isLoading: boolean;
  editScenarioId?: number | null;
  onEditHandled?: () => void;
  onViewForecast?: (scenarioId: number, calculated?: boolean) => void;
}

interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ scenarios, onScenariosChange, isLoading, editScenarioId, onEditHandled, onViewForecast }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState<number | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ProjectionScenario | null>(null);
  const [notification, setNotification] = useState<NotificationProps | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_default: false, parameters: [] as ProjectionParameterCreate[] });
  const busy = isLoading || isSaving || isDeleting || isCalculating !== null || isRecomputing;
  
  // Derive the shared holdings market value from the scenarios (kept identical across all)
  const sharedHoldingsValue = scenarios.map(s => s.parameters?.find(p => p.param_name === 'holdings_market_value')?.param_value).find(v => v !== undefined) ?? 0;

  // Auto-dismiss successful notifications after 3 seconds
  useEffect(() => {
    if (notification?.type === 'success') {
      const timer = setTimeout(() => { setNotification(null); }, 3000);
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
    setFormError(null);
    setFormData({
      name: '', description: '', is_default: false,
      parameters: [
        { param_name: 'income_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'essential_expenses_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'discretionary_expenses_growth_rate', param_value: 0.03, param_type: 'percentage' },
        { param_name: 'investment_rate', param_value: 0.10, param_type: 'percentage' },
        { param_name: 'inflation_rate', param_value: 0.02, param_type: 'percentage' },
        { param_name: 'investment_return_rate', param_value: 0.07, param_type: 'percentage' },
        { param_name: 'emergency_fund_target', param_value: 6.0, param_type: 'months' },
        { param_name: 'holdings_market_value', param_value: sharedHoldingsValue, param_type: 'amount' }
      ]
    });
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = useCallback((scenario: ProjectionScenario) => {
    setFormError(null);
    setSelectedScenario(scenario);
    setFormData({
      name: scenario.name, description: scenario.description, is_default: scenario.is_default,
      parameters: scenario.parameters?.map((p: ProjectionParameter) => ({ param_name: p.param_name, param_value: p.param_value, param_type: p.param_type })) || []
    });
    setIsEditDialogOpen(true);
  }, []);

  useEffect(() => {
    const scenario = scenarios.find(item => item.id === editScenarioId);
    if (scenario) { openEditDialog(scenario); onEditHandled?.(); }
  }, [editScenarioId, scenarios, openEditDialog, onEditHandled]);

  // Open delete dialog
  const openDeleteDialog = (scenario: ProjectionScenario) => {
    setFormError(null);
    setSelectedScenario(scenario);
    setIsDeleteDialogOpen(true);
  };

  // Handle create scenario
  const handleCreateScenario = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setFormError(null);
      const scenario = await createScenario({ ...formData, name: formData.name.trim() });
      setIsCreateDialogOpen(false);
      onScenariosChange();
      showNotification('success', 'Success', 'Scenario created successfully');
      onViewForecast?.(scenario.id);
    } catch {
      setFormError('Could not create the scenario. Your entries have been kept. Try saving again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update scenario
  const handleUpdateScenario = async () => {
    if (!selectedScenario || isSaving) return;
    try {
      setIsSaving(true);
      setFormError(null);
      await updateScenario(selectedScenario.id, { ...formData, name: formData.name.trim() });
      setIsEditDialogOpen(false);
      onScenariosChange();
      showNotification('success', 'Success', 'Scenario updated. Recalculate its forecast to include your changes.');
      onViewForecast?.(selectedScenario.id);
    } catch {
      setFormError('Could not save the scenario. Your entries have been kept. Try saving again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete scenario
  const handleDeleteScenario = async () => {
    if (!selectedScenario || isDeleting) return;
    try {
      setIsDeleting(true);
      setFormError(null);
      await deleteScenario(selectedScenario.id);
      showNotification('success', 'Success', 'Scenario deleted successfully');
      setIsDeleteDialogOpen(false);
      onScenariosChange();
    } catch {
      setFormError('Could not delete the scenario. Try deleting it again, or cancel to keep it.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle calculate projection
  const handleCalculateProjection = async (scenarioId: number) => {
    if (busy) return;
    try {
      setIsCalculating(scenarioId);
      await calculateProjection(scenarioId);
      showNotification('success', 'Forecast calculated', 'The forecast has been calculated successfully.');
      onViewForecast?.(scenarioId, true);
    } catch {
      showNotification('error', 'Calculation failed', 'Could not confirm the calculation. View the forecast to check its saved status, then retry if needed.');
    } finally {
      setIsCalculating(null);
    }
  };

  // Handle recompute base scenario parameters
  const handleRecomputeBaseScenario = async () => {
    if (busy) return;
    try {
      setIsRecomputing(true);
      const result = await recomputeBaseScenario();
      onScenariosChange();
      showNotification('success', 'Assumptions refreshed', 'Base assumptions updated using transaction data. Calculate the forecast to include these changes.');
      onViewForecast?.(result.scenario_id);
    } catch {
      showNotification('error', 'Refresh failed', 'Could not refresh the base assumptions and forecast. Try refreshing again before relying on saved results.');
    } finally {
      setIsRecomputing(false);
    }
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div role={notification.type === 'error' ? 'alert' : 'status'} className={`p-4 rounded-md ${notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-1" aria-hidden="true" />
            <div className="min-w-0"><p className="font-medium">{notification.title}</p><p className="text-sm">{notification.message}</p></div>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotification(null)} className="ml-auto min-h-11 min-w-11 flex items-center justify-center"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-medium">Projection scenarios</h2>
        <button type="button" disabled={busy} onClick={openCreateDialog} className="flex items-center min-h-11 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Create scenario</button>
      </div>
      <HoldingsValueEditor value={sharedHoldingsValue} disabled={busy || !scenarios.length} onSaved={onScenariosChange} />
      {isLoading ? <p role="status" className="py-8 text-gray-600 dark:text-gray-300">Loading scenarios…</p> : !scenarios.length ? (
        <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"><h3 className="font-medium">No scenarios yet</h3><p className="text-sm">Create a scenario to start exploring your financial future.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {scenarios.map(scenario => <ScenarioCard key={scenario.id} scenario={scenario} busy={busy} isCalculating={isCalculating === scenario.id} isRecomputing={isRecomputing} onCalculate={() => handleCalculateProjection(scenario.id)} onView={onViewForecast ? () => onViewForecast(scenario.id) : undefined} onEdit={() => openEditDialog(scenario)} onDelete={() => openDeleteDialog(scenario)} onRecompute={handleRecomputeBaseScenario} />)}
        </div>
      )}

      {/* Create Scenario Dialog */}
      <ScenarioFormDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} title="Create scenario" description="Choose assumptions for a possible financial future. Defaults are a starting point, not financial advice." formData={formData} onInputChange={handleInputChange} onSwitchChange={handleSwitchChange} onParametersChange={handleParametersChange} onSubmit={handleCreateScenario} submitLabel="Create scenario" isSaving={isSaving} error={formError} />

      {/* Edit Scenario Dialog */}
      <ScenarioFormDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} title="Edit assumptions" description={selectedScenario?.is_base_scenario ? 'Manual assumptions are retained when calculating. Refresh from transactions only when you want to replace the base scenario’s growth and allocation assumptions.' : 'Changes affect this scenario. Recalculate its forecast after saving.'} formData={formData} onInputChange={handleInputChange} onSwitchChange={handleSwitchChange} onParametersChange={handleParametersChange} onSubmit={handleUpdateScenario} submitLabel="Save assumptions" idPrefix="edit-" isSaving={isSaving} error={formError} />

      {/* Delete Scenario Dialog */}
      <DeleteConfirmDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} scenario={selectedScenario} onConfirm={handleDeleteScenario} isDeleting={isDeleting} error={formError} />
    </div>
  );
};

export default ScenarioManager;
