import React from 'react';
import type { ProcessedDataRow, Settings, Filters, DataValidation } from '../types';
import Header from './Header';
import { KpiCard, formatNumber, formatPercentage } from './ui/kpiHelpers';
import { LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, Line } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon } from './ui/Icons';


interface DashboardProps {
    data: ProcessedDataRow[];
    fullData: ProcessedDataRow[];
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    planDataExists: boolean;
    onClearData: () => void;
    availableYears: number[];
    availableRegions: string[];
    availableProducts: string[];
    validationInfo: DataValidation | null;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { data, settings, filters, planDataExists } = props;

    // Memoize aggregations
    const aggregatedMetrics = React.useMemo(() => {
        if (data.length === 0) return null;
        
        const latestQuarterData = data.reduce((latest: ProcessedDataRow, current: ProcessedDataRow) => (current.sortKey > latest.sortKey ? current : latest));

        const totalRevenue = data.reduce((sum, d) => sum + d.Revenue, 0);
        const totalNetIncome = data.reduce((sum, d) => sum + d['Net Income'], 0);
        const totalEBITDA = data.reduce((sum, d) => sum + d.EBITDA, 0);

        const yoyRevenue = latestQuarterData?.yoyRevenueGrowth ?? null;
        const yoyNetIncome = latestQuarterData?.yoyNetIncomeGrowth ?? null;

        const weightedGrossMargin = totalRevenue > 0 ? (data.reduce((sum, d) => sum + d.grossProfit, 0) / totalRevenue) * 100 : 0;
        const weightedEbitdaMargin = totalRevenue > 0 ? (totalEBITDA / totalRevenue) * 100 : 0;
        const weightedNetMargin = totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : 0;
        const weightedOpexMargin = totalRevenue > 0 ? (data.reduce((sum, d) => sum + d.OPEX, 0) / totalRevenue) * 100 : 0;

        return {
            totalRevenue, totalNetIncome, totalEBITDA,
            yoyRevenue, yoyNetIncome,
            weightedGrossMargin, weightedEbitdaMargin, weightedNetMargin, weightedOpexMargin,
            latestQuarter: latestQuarterData,
        }
    }, [data]);
    
    React.useEffect(() => {
        if(data.length > 0 && !filters.focusedQuarter) {
            const latestQuarter = data.reduce((latest: ProcessedDataRow, current: ProcessedDataRow) => (current.sortKey > latest.sortKey ? current : latest));
            props.setFilters(f => ({...f, focusedQuarter: latestQuarter.Quarter}));
        }
    }, [data, filters.focusedQuarter, props.setFilters]);


    const sortedQuarters = React.useMemo(() => {
        const uniqueQuarters = [...new Set(data.map(d => d.Quarter))];
        const quarterMap: Map<string, ProcessedDataRow> = new Map(data.map(d => [d.Quarter, d]));
        // FIX: Explicitly type sort arguments as string to resolve 'unknown' type error.
        return uniqueQuarters.sort((a: string, b: string) => {
            const itemA = quarterMap.get(a);
            const itemB = quarterMap.get(b);
            if (!itemA || !itemB) return 0;
            return itemB.sortKey - itemA.sortKey;
        });
    }, [data]);

    // Data for charts
    const chartData = React.useMemo(() => {
        const groupedByQuarter = data.reduce((acc, row) => {
            if (!acc[row.Quarter]) {
                acc[row.Quarter] = { Quarter: row.Quarter, sortKey: row.sortKey, Revenue: 0, 'Net Income': 0, COGS: 0, OPEX: 0 };
            }
            acc[row.Quarter].Revenue += row.Revenue;
            acc[row.Quarter]['Net Income'] += row['Net Income'];
            acc[row.Quarter].COGS += row.COGS;
            acc[row.Quarter].OPEX += row.OPEX;
            return acc;
        // FIX: Provide a specific type for the accumulator to avoid 'any' and allow TS to infer types correctly for the subsequent sort.
        }, {} as { [key: string]: { Quarter: string, sortKey: number, Revenue: number, 'Net Income': number, COGS: number, OPEX: number } });

        return Object.values(groupedByQuarter).sort((a, b) => a.sortKey - b.sortKey);
    }, [data]);

    const sparklineData = React.useMemo(() => {
        const last6Quarters = chartData.slice(-6);
        return {
            revenue: last6Quarters.map(d => ({ name: d.Quarter, value: d.Revenue })),
            netIncome: last6Quarters.map(d => ({ name: d.Quarter, value: d['Net Income'] })),
        }
    }, [chartData]);
    
    // --- RENDER ---
    if (!aggregatedMetrics) {
        return <div className="p-8 text-center text-text-muted">No data matches the current filters.</div>;
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="p-2 bg-background-elevated border border-border-color rounded-lg shadow-lg text-sm">
                <p className="font-bold text-text-primary">{label}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} style={{ color: pld.color }}>{`${pld.name}: ${formatNumber(pld.value)} M`}</div>
                ))}
            </div>
            );
        }
        return null;
    };

    return (
        <div id="export-container" className="p-4 sm:p-6 lg:p-8 bg-background font-sans">
            <Header {...props} sortedQuarters={sortedQuarters} />
            <main className="mt-6 space-y-6">
                
                <section id="kpi-overview">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">KPI Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                       <KpiCard title="Revenue (EUR m)" value={formatNumber(aggregatedMetrics.totalRevenue)} change={aggregatedMetrics.yoyRevenue} changeLabel="YoY" sparklineData={sparklineData.revenue} />
                       <KpiCard title="EBITDA (EUR m)" value={formatNumber(aggregatedMetrics.totalEBITDA)} subValue={`${formatPercentage(aggregatedMetrics.weightedEbitdaMargin)} Margin`} subValueStatus={aggregatedMetrics.weightedEbitdaMargin < settings.thresholds.ebitdaMargin ? 'warning' : 'good'} />
                       <KpiCard title="Net Income (EUR m)" value={formatNumber(aggregatedMetrics.totalNetIncome)} change={aggregatedMetrics.yoyNetIncome} changeLabel="YoY" sparklineData={sparklineData.netIncome} />
                       <KpiCard title="Gross Margin %" value={formatPercentage(aggregatedMetrics.weightedGrossMargin)} />
                       <KpiCard title="OPEX % of Revenue" value={formatPercentage(aggregatedMetrics.weightedOpexMargin)} />
                       <KpiCard title="Net Margin %" value={formatPercentage(aggregatedMetrics.weightedNetMargin)} status={aggregatedMetrics.weightedNetMargin < settings.thresholds.netMargin ? 'bad' : 'good'} />
                    </div>
                </section>
                
                <section id="charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-background-elevated p-6 rounded-lg shadow-md">
                         <h3 className="text-lg font-semibold mb-4 text-text-primary">Revenue & Net Income</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="Quarter" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--color-border)'}} tickLine={{ stroke: 'var(--color-border)'}} />
                                <YAxis yAxisId="left" label={{ value: 'EUR m', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--color-border)'}} tickLine={{ stroke: 'var(--color-border)'}}/>
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Line yAxisId="left" type="monotone" dataKey="Revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{r:4}} activeDot={{r:8, strokeWidth: 2, fill: 'var(--color-bg-elevated)'}} />
                                <Line yAxisId="left" type="monotone" dataKey="Net Income" stroke="var(--color-success)" strokeWidth={2} dot={{r:4}} activeDot={{r:8, strokeWidth: 2, fill: 'var(--color-bg-elevated)'}}/>
                            </LineChart>
                         </ResponsiveContainer>
                    </div>
                    <div className="bg-background-elevated p-6 rounded-lg shadow-md">
                         <h3 className="text-lg font-semibold mb-4 text-text-primary">Cost Structure</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="Quarter" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--color-border)'}} tickLine={{ stroke: 'var(--color-border)'}} />
                                <YAxis label={{ value: 'EUR m', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--color-border)'}} tickLine={{ stroke: 'var(--color-border)'}} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="COGS" stackId="a" fill="#ef4444" name="COGS" />
                                <Bar dataKey="OPEX" stackId="a" fill="#f97316" name="OPEX" />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                </section>

                <section id="variance-analysis" className="bg-background-elevated p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Variance vs Budget</h2>
                    {planDataExists ? 
                      <p className="text-text-muted">Variance analysis panel will be implemented here.</p>
                      :
                      <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-text-primary">Plan Data Not Provided</h3>
                        <p className="text-text-muted mt-2">To enable variance analysis, please include `Plan_*` columns in your CSV file.</p>
                      </div>
                    }
                </section>

                <section id="board-narrative" className="bg-background-elevated p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Board Narrative</h2>
                    <ul className="list-disc list-inside space-y-2 text-text-primary">
                        <li><strong>Topline:</strong> {`Latest quarter revenue shows a ${formatPercentage(aggregatedMetrics.yoyRevenue)} change YoY.`}</li>
                        <li><strong>Profitability:</strong> {`EBITDA stands at €${formatNumber(aggregatedMetrics.totalEBITDA)}m with a ${formatPercentage(aggregatedMetrics.weightedEbitdaMargin)} margin. Net Margin is ${formatPercentage(aggregatedMetrics.weightedNetMargin)}.`}</li>
                        <li><strong>Cost Structure:</strong> Cost of Goods Sold and Operating Expenses trends can be seen in the chart above.</li>
                    </ul>
                </section>

                <section id="detailed-table" className="bg-background-elevated p-6 rounded-lg shadow-md overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Quarterly Detail</h2>
                    <table className="w-full text-sm text-left text-text-muted">
                        <thead className="text-xs text-text-primary uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Quarter</th>
                                <th scope="col" className="px-6 py-3 text-right">Revenue</th>
                                <th scope="col" className="px-6 py-3 text-right">EBITDA</th>
                                <th scope="col" className="px-6 py-3 text-right">EBITDA %</th>
                                <th scope="col" className="px-6 py-3 text-right">Net Margin %</th>
                                <th scope="col" className="px-6 py-3 text-right">YoY Rev %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice().sort((a,b) => b.sortKey - a.sortKey).map(row => (
                                <tr key={row.id} className="border-b border-border-color hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-text-primary whitespace-nowrap">{row.Quarter}</th>
                                    <td className="px-6 py-4 text-right">{formatNumber(row.Revenue)}</td>
                                    <td className="px-6 py-4 text-right">{formatNumber(row.EBITDA)}</td>
                                    <td className="px-6 py-4 text-right">{formatPercentage(row.EBITDA_Margin)}</td>
                                    <td className={`px-6 py-4 font-semibold text-right ${row.netMargin < settings.thresholds.netMargin ? 'text-danger' : 'text-success'}`}>{formatPercentage(row.netMargin)}</td>
                                    <td className={`px-6 py-4 flex items-center justify-end ${row.yoyRevenueGrowth && row.yoyRevenueGrowth < 0 ? 'text-danger' : 'text-success'}`}>
                                        {row.yoyRevenueGrowth ? (row.yoyRevenueGrowth > 0 ? <ArrowUpIcon className="w-4 h-4"/> : <ArrowDownIcon className="w-4 h-4"/>) : null}
                                        <span className="ml-1">{formatPercentage(row.yoyRevenueGrowth)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
};


export default Dashboard;