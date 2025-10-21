import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processFinancialData } from './services/dataProcessor';
import type { ProcessedDataRow, Settings, Filters, DataValidation } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { getInitialState } from './services/localStorageManager';

const App: React.FC = () => {
    const [data, setData] = useState<ProcessedDataRow[]>([]);
    const [settings, setSettings] = useState<Settings>(getInitialState('settings', {
        companyName: 'FMCG Co.',
        logo: null,
        primaryColor: '#4f46e5',
        thresholds: {
            netMargin: 8,
            ebitdaMargin: 12,
            qoqRevenueGrowth: 0,
            variance: 3,
        }
    }));
    const [filters, setFilters] = useState<Filters>(getInitialState('filters', {
        years: [],
        regions: [],
        products: [],
        focusedQuarter: null,
    }));
    const [darkMode, setDarkMode] = useState<boolean>(getInitialState('darkMode', false));
    const [planDataExists, setPlanDataExists] = useState<boolean>(false);
    const [validationInfo, setValidationInfo] = useState<DataValidation | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'upload' | 'dashboard'>('upload');

    useEffect(() => {
        const initialData = getInitialState<ProcessedDataRow[]>('processedData', []);
        if (initialData.length > 0) {
            setData(initialData);
            setPlanDataExists(initialData.some(d => d.plan_Revenue !== null));
            const years = [...new Set(initialData.map(d => d.Year))].sort((a, b) => b - a);
            
            const initialFilters = getInitialState('filters', {
                years: years.length > 0 ? [years[0]] : [],
                regions: [],
                products: [],
                focusedQuarter: null,
            });
            setFilters(initialFilters);
            setView('dashboard');
        }
         const initialValidation = getInitialState<DataValidation | null>('validationInfo', null);
         if (initialValidation) {
            setValidationInfo(initialValidation);
         }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Persist state to localStorage
        localStorage.setItem('settings', JSON.stringify(settings));
        localStorage.setItem('filters', JSON.stringify(filters));
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
        if(view === 'dashboard') {
            localStorage.setItem('processedData', JSON.stringify(data));
            localStorage.setItem('validationInfo', JSON.stringify(validationInfo));
        }
    }, [data, settings, filters, darkMode, validationInfo, view]);
    
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary-light', settings.primaryColor);
        // A simple way to generate a darker shade for hover states, etc.
        // A proper library like tinycolor2 would be better for complex palettes.
        const darkerColor = settings.primaryColor.replace(/..$/, (s) =>
            Math.max(0, parseInt(s, 16) - 20).toString(16).padStart(2, '0')
        );
        root.style.setProperty('--color-primary-dark', darkerColor);
    }, [settings.primaryColor]);

    const handleDataProcessed = useCallback((processedData: ProcessedDataRow[], validation: DataValidation) => {
        setError(null);
        try {
            setData(processedData);
            setValidationInfo(validation);
            
            const hasPlanData = validation.hasPlanData;
            setPlanDataExists(hasPlanData);

            const years = [...new Set(processedData.map(d => d.Year))].sort((a, b) => b - a);
            
            setFilters({
                years: years.length > 0 ? [years[0]] : [],
                regions: [],
                products: [],
                focusedQuarter: null
            });

            setView('dashboard');
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred during data processing.');
            }
            setData([]);
            setValidationInfo(null);
        }
    }, []);

    const handleClearData = useCallback(() => {
        setData([]);
        setValidationInfo(null);
        setFilters({ years: [], regions: [], products: [], focusedQuarter: null });
        setError(null);
        localStorage.removeItem('processedData');
        localStorage.removeItem('validationInfo');
        localStorage.removeItem('filters');
        setView('upload');
    }, []);

    const availableYears = useMemo(() => [...new Set(data.map(d => d.Year))].sort((a: number, b: number) => b - a), [data]);
    const availableRegions = useMemo(() => ['All', ...new Set(data.map(d => d.Region))].sort(), [data]);
    const availableProducts = useMemo(() => ['All', ...new Set(data.map(d => d.Product))].sort(), [data]);

    const filteredData = useMemo(() => {
        return data.filter(d => {
            const yearMatch = filters.years.length === 0 || filters.years.includes(d.Year);
            const regionMatch = filters.regions.length === 0 || filters.regions.includes('All') || filters.regions.includes(d.Region);
            const productMatch = filters.products.length === 0 || filters.products.includes('All') || filters.products.includes(d.Product);
            return yearMatch && regionMatch && productMatch;
        });
    }, [data, filters]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-background"><div className="text-xl font-semibold text-text-primary">Loading...</div></div>
    }

    return (
        <div className="min-h-screen bg-background text-text-primary">
            {view === 'upload' ? (
                <FileUpload onDataProcessed={handleDataProcessed} initialError={error} />
            ) : (
                <Dashboard
                    data={filteredData}
                    fullData={data}
                    filters={filters}
                    setFilters={setFilters}
                    settings={settings}
                    setSettings={setSettings}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    planDataExists={planDataExists}
                    onClearData={handleClearData}
                    availableYears={availableYears}
                    availableRegions={availableRegions}
                    availableProducts={availableProducts}
                    validationInfo={validationInfo}
                />
            )}
        </div>
    );
};

export default App;