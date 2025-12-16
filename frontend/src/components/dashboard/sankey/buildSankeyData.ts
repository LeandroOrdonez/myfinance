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
 * [Income Categories] → [Total Income] → [Total Expenses] → [Expense Categories]
 * 
 * If there's a surplus (income > expenses), it flows to a "Savings" node.
 * If there's a deficit (expenses > income), the diagram still shows the flow.
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
  // Order: Income categories, "Total Income", "Total Expenses", Expense categories, optionally "Savings"
  const nodes: SankeyNode[] = [];
  
  // Add income category nodes
  topIncome.forEach(cat => {
    nodes.push({ name: cat.category_name });
  });
  
  // Add central nodes
  const totalIncomeIndex = nodes.length;
  nodes.push({ name: 'Total Income' });
  
  const totalExpensesIndex = nodes.length;
  nodes.push({ name: 'Total Expenses' });
  
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
  
  // Link from Total Income to Total Expenses (the amount that flows to expenses)
  const flowToExpenses = Math.min(totalIncome, totalExpenses);
  if (flowToExpenses > 0) {
    links.push({
      source: totalIncomeIndex,
      target: totalExpensesIndex,
      value: flowToExpenses
    });
  }
  
  // Link from Total Income to Savings (if surplus)
  if (savings > 0 && savingsIndex >= 0) {
    links.push({
      source: totalIncomeIndex,
      target: savingsIndex,
      value: savings
    });
  }
  
  // Links from Total Expenses to expense categories
  topExpenses.forEach((cat, index) => {
    if (cat.average_amount > 0) {
      links.push({
        source: totalExpensesIndex,
        target: expenseStartIndex + index,
        value: cat.average_amount
      });
    }
  });

  return { nodes, links };
}

/**
 * Get node color based on its position/type in the Sankey diagram
 */
export function getNodeColor(index: number, totalNodes: number, hasSavings: boolean): string {
  // Income categories (green shades)
  const incomeColors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
  
  // Expense categories (pink/red shades)  
  const expenseColors = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#db2777', '#be185d', '#9d174d', '#831843'];
  
  // Central nodes
  const centralIncomeColor = '#059669'; // emerald-600
  const centralExpenseColor = '#db2777'; // pink-600
  const savingsColor = '#3b82f6'; // blue-500

  // Determine node type based on index
  // Structure: [income cats...] [Total Income] [Total Expenses] [expense cats...] [Savings?]
  
  if (hasSavings && index === totalNodes - 1) {
    return savingsColor;
  }
  
  // Find the central node indices by working backwards
  const expenseCatCount = hasSavings ? 
    Math.floor((totalNodes - 3) / 2) : 
    Math.floor((totalNodes - 2) / 2);
  const incomeCatCount = totalNodes - 2 - expenseCatCount - (hasSavings ? 1 : 0);
  
  const totalIncomeIdx = incomeCatCount;
  const totalExpensesIdx = incomeCatCount + 1;
  const expenseStartIdx = incomeCatCount + 2;
  
  if (index < totalIncomeIdx) {
    // Income category
    return incomeColors[index % incomeColors.length];
  } else if (index === totalIncomeIdx) {
    return centralIncomeColor;
  } else if (index === totalExpensesIdx) {
    return centralExpenseColor;
  } else if (index >= expenseStartIdx) {
    // Expense category
    const expenseIdx = index - expenseStartIdx;
    return expenseColors[expenseIdx % expenseColors.length];
  }
  
  return '#6b7280'; // gray fallback
}
