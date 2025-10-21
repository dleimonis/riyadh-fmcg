import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, AlertTriangleIcon } from './Icons';

// FORMATTERS
export const formatNumber = (value: number | null | undefined, decimals = 1): string => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatPercentage = (value: number | null | undefined, decimals = 1): string => {
    if (value === null || value === undefined) return '—';
    return `${formatNumber(value, decimals)}%`;
};

// COMPONENTS
interface VarianceBadgeProps {
    value: number | null;
    threshold: number;
}
export const VarianceBadge: React.FC<VarianceBadgeProps> = ({ value, threshold }) => {
    if (value === null) return <span className="badge-gray">N/A</span>;
    if (value > threshold) return <span className="badge-green">Above Plan</span>;
    if (value < -threshold) return <span className="badge-red">Under Plan</span>;
    return <span className="badge-gray">On Plan</span>;
};

interface KpiCardProps {
    title: string;
    value: string;
    change?: number | null;
    changeLabel?: string;
    subValue?: string;
    sparklineData?: { name: string; value: number }[];
    status?: 'good' | 'bad' | 'warning';
    subValueStatus?: 'good' | 'bad' | 'warning';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeLabel, subValue, sparklineData, status, subValueStatus }) => {
    const changeColor = change === null || change === undefined ? 'text-text-muted' : change >= 0 ? 'text-success' : 'text-danger';
    const statusColor = status === 'bad' ? 'text-danger' : status === 'warning' ? 'text-warning' : 'text-text-primary';
    const subStatusColor = subValueStatus === 'bad' ? 'text-danger' : subValueStatus === 'warning' ? 'text-warning' : 'text-text-muted';

    return (
        <div className="bg-background-elevated p-4 rounded-lg shadow-md flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-text-muted truncate">{title}</p>
                    {status === 'bad' && <span title="Below threshold" className="text-danger"><AlertTriangleIcon className="w-4 h-4" /></span>}
                    {status === 'warning' && <span title="Nearing threshold" className="text-warning"><AlertTriangleIcon className="w-4 h-4" /></span>}
                </div>
                <p className={`mt-1 text-3xl font-semibold ${statusColor}`}>{value}</p>
            </div>
            <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                    {change !== undefined ? (
                        <div className={`flex items-center font-medium ${changeColor}`}>
                            {change !== null ? (change >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />) : null}
                            <span className="ml-1">{formatPercentage(change)} {changeLabel}</span>
                        </div>
                    ) : <div />}
                    {subValue && (
                         <p className={`font-medium ${subStatusColor}`}>{subValue}</p>
                    )}
                </div>
                {sparklineData && sparklineData.length > 1 && (
                    <div className="mt-2 h-10 -mx-4 -mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={sparklineData}>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '0.5rem',
                                        fontSize: '12px',
                                        padding: '4px 8px',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    labelStyle={{ display: 'none' }}
                                    formatter={(value: number) => [formatNumber(value), null]}
                                    cursor={{ stroke: 'var(--color-border)'}}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={change === null || change === undefined || change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};
