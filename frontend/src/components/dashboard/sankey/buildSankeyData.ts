import { TransactionType } from '../../../types/transaction';

export interface CategoryAverageItem {
  category_name: string;
  transaction_type: string;
  expense_type: string | null;
  average_amount: number;
  total_amount: number;
  transaction_count: number;
  average_transaction_amount: number;
  percentage: number;
}

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Builds Sankey diagram data from income and expense category averages.
 * 
 * Structure:
 * [Income Categories] → [Total Income] → [Expense Categories + Savings]
 * 
 * If there's a surplus (income > expenses), it flows to a "Savings" node.
 */
export function buildSankeyData(
  incomeCategories: CategoryAverageItem[],
  expenseCategories: CategoryAverageItem[],
  topN: number = 8
): SankeyData {
  // Take top N categories by average amount
  const topIncome = [...incomeCategories]
    .sort((a, b) => b.average_amount - a.average_amount)
    .slice(0, topN);
  
  const topExpenses = [...expenseCategories]
    .sort((a, b) => b.average_amount - a.average_amount)
    .slice(0, topN);

  // Calculate totals
  const totalIncome = incomeCategories.reduce((sum, cat) => sum + cat.average_amount, 0);
  const totalExpenses = expenseCategories.reduce((sum, cat) => sum + cat.average_amount, 0);
  const savings = Math.max(0, totalIncome - totalExpenses);

  // Build nodes array
  // Order: Income categories, "Total Income", Expense categories, optionally "Savings"
  const nodes: SankeyNode[] = [];
  
  // Add income category nodes
  topIncome.forEach(cat => {
    nodes.push({ name: cat.category_name });
  });
  
  // Add central node
  const totalIncomeIndex = nodes.length;
  nodes.push({ name: 'Total Income' });
  
  // Add expense category nodes
  const expenseStartIndex = nodes.length;
  topExpenses.forEach(cat => {
    nodes.push({ name: cat.category_name });
  });
  
  // Add savings node if there's a surplus
  let savingsIndex = -1;
  if (savings > 0) {
    savingsIndex = nodes.length;
    nodes.push({ name: 'Savings' });
  }

  // Build links array
  const links: SankeyLink[] = [];
  
  // Links from income categories to Total Income
  topIncome.forEach((cat, index) => {
    if (cat.average_amount > 0) {
      links.push({
        source: index,
        target: totalIncomeIndex,
        value: cat.average_amount
      });
    }
  });
  
  // Links from Total Income directly to expense categories
  topExpenses.forEach((cat, index) => {
    if (cat.average_amount > 0) {
      links.push({
        source: totalIncomeIndex,
        target: expenseStartIndex + index,
        value: cat.average_amount
      });
    }
  });
  
  // Link from Total Income to Savings (if surplus)
  if (savings > 0 && savingsIndex >= 0) {
    links.push({
      source: totalIncomeIndex,
      target: savingsIndex,
      value: savings
    });
  }

  return { nodes, links };
}

/**
 * Get node color based on its position/type in the Sankey diagram.
 * Structure: [income cats...] [Total Income] [expense cats...] [Savings?]
 */
export function getNodeColor(
  index: number, 
  incomeCatCount: number, 
  hasSavings: boolean, 
  totalNodes: number
): string {
  // Income categories (green shades)
  const incomeColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
  
  // Expense categories (pink/red shades)  
  const expenseColors = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#db2777', '#be185d', '#9d174d', '#831843'];
  
  const centralIncomeColor = '#059669'; // emerald-600
  const savingsColor = '#3b82f6'; // blue-500

  const totalIncomeIdx = incomeCatCount;
  const expenseStartIdx = incomeCatCount + 1;
  
  // Savings is always the last node if present
  if (hasSavings && index === totalNodes - 1) {
    return savingsColor;
  }
  
  if (index < totalIncomeIdx) {
    // Income category
    return incomeColors[index % incomeColors.length];
  } else if (index === totalIncomeIdx) {
    return centralIncomeColor;
  } else if (index >= expenseStartIdx) {
    // Expense category
    const expenseIdx = index - expenseStartIdx;
    return expenseColors[expenseIdx % expenseColors.length];
  }
  
  return '#6b7280'; // gray fallback
}
