
import type { RawDataRow, ProcessedDataRow } from '../types';

const parseQuarter = (quarterStr: string): { year: number; quarterIndex: number; sortKey: number } => {
    if (!quarterStr || !quarterStr.match(/^Q[1-4]-\d{4}$/)) {
        throw new Error(`Invalid Quarter format: "${quarterStr}". Expected format is "Q1-2023".`);
    }
    const parts = quarterStr.split('-');
    const qIndex = parseInt(parts[0].substring(1), 10);
    const year = parseInt(parts[1], 10);
    return { year, quarterIndex: qIndex, sortKey: year + qIndex / 4 };
};

const safeParseFloat = (val: string | undefined, defaultValue: number | null = 0): number | null => {
    if (val === undefined || val === null || val.trim() === '') return defaultValue;
    const num = parseFloat(val);
    return isNaN(num) ? defaultValue : num;
};


export const processFinancialData = (rawData: RawDataRow[]): ProcessedDataRow[] => {
    const dataWithMetrics = rawData.map((row, index) => {
        const { year, quarterIndex, sortKey } = parseQuarter(row.Quarter);
        
        const Revenue = safeParseFloat(row.Revenue, 0)!;
        const COGS = safeParseFloat(row.COGS, 0)!;
        const OPEX = safeParseFloat(row.OPEX, 0)!;
        const Non_Cash_Adjustments = safeParseFloat(row.Non_Cash_Adjustments, 0)!;
        const NetIncome = safeParseFloat(row['Net Income'], null);
        const finalNetIncome = NetIncome === null ? Revenue - COGS - OPEX : NetIncome;

        // Plan data
        const plan_Revenue = safeParseFloat(row.Plan_Revenue, null);
        const plan_COGS = safeParseFloat(row.Plan_COGS, null);
        const plan_OPEX = safeParseFloat(row.Plan_OPEX, null);
        const plan_Non_Cash_Adjustments = safeParseFloat(row.Plan_Non_Cash_Adjustments, Non_Cash_Adjustments)!;
        const plan_NetIncomeRaw = safeParseFloat(row.Plan_NetIncome, null);
        const plan_NetIncome = plan_NetIncomeRaw === null && plan_Revenue !== null && plan_COGS !== null && plan_OPEX !== null 
            ? plan_Revenue - plan_COGS - plan_OPEX 
            : plan_NetIncomeRaw;

        // Derived Metrics
        const grossProfit = Revenue - COGS;
        const grossMargin = Revenue !== 0 ? (grossProfit / Revenue) * 100 : 0;
        const opexMargin = Revenue !== 0 ? (OPEX / Revenue) * 100 : 0;
        const EBITDA = Revenue - COGS - OPEX + Non_Cash_Adjustments;
        const EBITDA_Margin = Revenue !== 0 ? (EBITDA / Revenue) * 100 : 0;
        const netMargin = Revenue !== 0 ? (finalNetIncome / Revenue) * 100 : 0;

        // Variance Calcs
        const revVarAbs = plan_Revenue !== null ? Revenue - plan_Revenue : null;
        const revVarPerc = plan_Revenue !== null && plan_Revenue !== 0 ? (revVarAbs! / plan_Revenue) * 100 : null;
        const cogsVarAbs = plan_COGS !== null ? COGS - plan_COGS : null;
        const cogsVarPerc = plan_COGS !== null && plan_COGS !== 0 ? (cogsVarAbs! / plan_COGS) * 100 : null;
        const opexVarAbs = plan_OPEX !== null ? OPEX - plan_OPEX : null;
        const opexVarPerc = plan_OPEX !== null && plan_OPEX !== 0 ? (opexVarAbs! / plan_OPEX) * 100 : null;

        const ebitdaPlan = (plan_Revenue !== null && plan_COGS !== null && plan_OPEX !== null) 
            ? plan_Revenue - plan_COGS - plan_OPEX + plan_Non_Cash_Adjustments 
            : null;
        const ebitdaVarAbs = ebitdaPlan !== null ? EBITDA - ebitdaPlan : null;
        const ebitdaVarPerc = ebitdaPlan !== null && ebitdaPlan !== 0 ? (ebitdaVarAbs! / ebitdaPlan) * 100 : null;
        
        const netIncomeVarAbs = plan_NetIncome !== null ? finalNetIncome - plan_NetIncome : null;
        const netIncomeVarPerc = plan_NetIncome !== null && plan_NetIncome !== 0 ? (netIncomeVarAbs! / plan_NetIncome) * 100 : null;


        return {
            id: `${row.Quarter}-${row.Region || 'All'}-${row.Product || 'All'}-${index}`,
            Quarter: row.Quarter,
            Year: year,
            quarterIndex,
            sortKey,
            Region: row.Region || 'All',
            Product: row.Product || 'All',
            Revenue,
            COGS,
            OPEX,
            Non_Cash_Adjustments,
            'Net Income': finalNetIncome,
            plan_Revenue,
            plan_COGS,
            plan_OPEX,
            plan_Non_Cash_Adjustments,
            plan_NetIncome,
            grossProfit,
            grossMargin,
            opexMargin,
            EBITDA,
            EBITDA_Margin,
            netMargin,
            qoqRevenueGrowth: null,
            qoqNetIncomeGrowth: null,
            yoyRevenueGrowth: null,
            yoyNetIncomeGrowth: null,
            revVarAbs,
            revVarPerc,
            cogsVarAbs,
            cogsVarPerc,
            opexVarAbs,
            opexVarPerc,
            ebitdaPlan,
            ebitdaVarAbs,
            ebitdaVarPerc,
            netIncomeVarAbs,
            netIncomeVarPerc,
        };
    }).sort((a, b) => a.sortKey - b.sortKey);

    // Calculate YoY and QoQ growth
    return dataWithMetrics.map((currentRow, index, arr) => {
        // Find previous quarter
        const prevQuarter = arr[index - 1];
        let qoqRevenueGrowth: number | null = null;
        let qoqNetIncomeGrowth: number | null = null;

        if (prevQuarter) {
            if (prevQuarter.Revenue !== 0) {
                qoqRevenueGrowth = ((currentRow.Revenue - prevQuarter.Revenue) / prevQuarter.Revenue) * 100;
            }
            if (prevQuarter['Net Income'] !== 0) {
                qoqNetIncomeGrowth = ((currentRow['Net Income'] - prevQuarter['Net Income']) / prevQuarter['Net Income']) * 100;
            }
        }
        
        // Find same quarter last year
        const prevYearQuarter = arr.find(d => 
            d.Year === currentRow.Year - 1 && 
            d.quarterIndex === currentRow.quarterIndex &&
            d.Region === currentRow.Region &&
            d.Product === currentRow.Product
        );
        let yoyRevenueGrowth: number | null = null;
        let yoyNetIncomeGrowth: number | null = null;

        if (prevYearQuarter) {
            if (prevYearQuarter.Revenue !== 0) {
                yoyRevenueGrowth = ((currentRow.Revenue - prevYearQuarter.Revenue) / prevYearQuarter.Revenue) * 100;
            }
            if (prevYearQuarter['Net Income'] !== 0) {
                yoyNetIncomeGrowth = ((currentRow['Net Income'] - prevYearQuarter['Net Income']) / prevYearQuarter['Net Income']) * 100;
            }
        }

        return {
            ...currentRow,
            qoqRevenueGrowth,
            qoqNetIncomeGrowth,
            yoyRevenueGrowth,
            yoyNetIncomeGrowth
        };
    });
};
