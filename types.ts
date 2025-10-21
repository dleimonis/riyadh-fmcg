
export interface RawDataRow {
    Quarter: string;
    Year: string;
    Region?: string;
    Product?: string;
    Revenue: string;
    COGS: string;
    OPEX: string;
    Non_Cash_Adjustments?: string;
    'Net Income'?: string;
    Plan_Revenue?: string;
    Plan_COGS?: string;
    Plan_OPEX?: string;
    Plan_Non_Cash_Adjustments?: string;
    Plan_NetIncome?: string;
}

export interface ProcessedDataRow {
    id: string;
    Quarter: string;
    Year: number;
    quarterIndex: number; // e.g., 1 for Q1, 2 for Q2
    sortKey: number; // e.g., 2023.25 for Q1 2023
    Region: string;
    Product: string;
    Revenue: number;
    COGS: number;
    OPEX: number;
    Non_Cash_Adjustments: number;
    'Net Income': number;
    plan_Revenue: number | null;
    plan_COGS: number | null;
    plan_OPEX: number | null;
    plan_Non_Cash_Adjustments: number | null;
    plan_NetIncome: number | null;

    // Derived metrics
    grossProfit: number;
    grossMargin: number; // as percentage
    opexMargin: number; // as percentage
    EBITDA: number;
    EBITDA_Margin: number; // as percentage
    netMargin: number; // as percentage

    // YoY/QoQ Growth
    qoqRevenueGrowth: number | null;
    qoqNetIncomeGrowth: number | null;
    yoyRevenueGrowth: number | null;
    yoyNetIncomeGrowth: number | null;
    
    // Plan Variance
    revVarAbs: number | null;
    revVarPerc: number | null;
    cogsVarAbs: number | null;
    cogsVarPerc: number | null;
    opexVarAbs: number | null;
    opexVarPerc: number | null;
    ebitdaPlan: number | null;
    ebitdaVarAbs: number | null;
    ebitdaVarPerc: number | null;
    netIncomeVarAbs: number | null;
    netIncomeVarPerc: number | null;
}

export interface Thresholds {
    netMargin: number;
    ebitdaMargin: number;
    qoqRevenueGrowth: number;
    variance: number;
}

export interface Settings {
    companyName: string;
    logo: string | null;
    primaryColor: string;
    thresholds: Thresholds;
}

export interface Filters {
    years: number[];
    regions: string[];
    products: string[];
    focusedQuarter: string | null;
}

export interface DataValidation {
    rowCount: number;
    yearsDetected: number[];
    missingValues: { [key: string]: number };
    hasPlanData: boolean;
}
