import React, { useState, useRef, useEffect } from 'react';
import type { Settings, Filters } from '../types';
import { SunIcon, MoonIcon, CogIcon, PaletteIcon, DownloadIcon, PrinterIcon, ChevronDownIcon, XIcon, UploadCloudIcon } from './ui/Icons';


const useOutsideClick = (ref: React.RefObject<HTMLElement>, callback: () => void, enabled: boolean) => {
    useEffect(() => {
        if (!enabled) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref, callback, enabled]);
};

interface MultiSelectProps {
    options: (string | number)[];
    selected: (string | number)[];
    onChange: (selected: (string | number)[]) => void;
    label: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, () => setIsOpen(false), isOpen);

    const handleSelect = (option: string | number) => {
        if (option === 'All') {
            onChange([]);
            return;
        }
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };
    
    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-background-elevated border border-border-color rounded-md shadow-sm pl-3 pr-10 py-2 text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm">
                <span className="block truncate">{selected.length === 0 ? `All ${label}s` : `${selected.length} ${label}(s) selected`}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"><ChevronDownIcon className="w-5 h-5 text-gray-400" /></span>
            </button>
            {isOpen && (
                <div className="absolute mt-1 w-full rounded-md bg-background-elevated shadow-lg z-10 max-h-60 overflow-auto border border-border-color">
                    {options.map(option => (
                        <div key={option} onClick={() => handleSelect(option)} className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary/10 text-text-primary">
                            <span className={`font-normal block truncate ${selected.includes(option) ? 'font-semibold text-primary' : ''}`}>{option}</span>
                            {selected.includes(option) && <span className="text-primary absolute inset-y-0 right-0 flex items-center pr-4">✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface HeaderProps {
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    onClearData: () => void;
    availableYears: number[];
    availableRegions: string[];
    availableProducts: string[];
    sortedQuarters: string[];
}

const Header: React.FC<HeaderProps> = ({ settings, setSettings, filters, setFilters, darkMode, setDarkMode, onClearData, availableYears, availableRegions, availableProducts, sortedQuarters }) => {
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    useOutsideClick(settingsRef, () => setShowSettings(false), showSettings);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => setSettings(s => ({ ...s, logo: event.target?.result as string }));
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const downloadCSV = () => { /* Logic to download detailed metrics CSV */ };
    const exportPDF = () => { window.print(); };

    return (
        <header className="bg-background-elevated p-4 rounded-lg shadow-md print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {settings.logo && <img src={settings.logo} alt="Company Logo" className="h-10 w-auto" />}
                    <h1 className="text-2xl font-bold text-text-primary">{settings.companyName} Report</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={downloadCSV} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-text-muted hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><DownloadIcon /> CSV</button>
                    <button onClick={exportPDF} className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-text-muted hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PrinterIcon /> PDF</button>
                    <button onClick={onClearData} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"><UploadCloudIcon /> New Upload</button>
                    <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{darkMode ? <SunIcon /> : <MoonIcon />}</button>
                    
                    <div className="relative">
                        <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><CogIcon /></button>
                         {showSettings && (
                            <div ref={settingsRef} className="absolute top-full right-0 mt-2 w-72 bg-background-elevated p-4 rounded-lg shadow-2xl z-20 border border-border-color">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-text-primary">Settings</h4>
                                    <button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><XIcon /></button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted">Company Name</label>
                                        <input type="text" value={settings.companyName} onChange={e => setSettings(s => ({...s, companyName: e.target.value}))} className="mt-1 block w-full bg-background border border-border-color rounded-md shadow-sm py-2 px-3 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted">Primary Color</label>
                                        <input type="color" value={settings.primaryColor} onChange={e => setSettings(s => ({...s, primaryColor: e.target.value}))} className="mt-1 block w-full h-8" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-muted">Logo (PNG/SVG)</label>
                                        <input type="file" onChange={handleLogoUpload} accept="image/png, image/svg+xml" className="mt-1 block w-full text-sm text-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-text-primary border-t border-border-color pt-3 mt-3">Thresholds</h5>
                                        <label className="block text-sm font-medium text-text-muted mt-2">Net Margin % (Red if below)</label>
                                        <input type="number" value={settings.thresholds.netMargin} onChange={e => setSettings(s => ({...s, thresholds: {...s.thresholds, netMargin: +e.target.value}}))} className="mt-1 block w-full bg-background border border-border-color rounded-md shadow-sm py-2 px-3 text-sm" />
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-color">
                <MultiSelect label="Year" options={availableYears} selected={filters.years} onChange={v => setFilters(f => ({...f, years: v as number[]}))} />
                <MultiSelect label="Region" options={availableRegions} selected={filters.regions} onChange={v => setFilters(f => ({...f, regions: v as string[]}))} />
                <MultiSelect label="Product" options={availableProducts} selected={filters.products} onChange={v => setFilters(f => ({...f, products: v as string[]}))} />
                <div>
                     <select value={filters.focusedQuarter || ''} onChange={e => setFilters(f => ({...f, focusedQuarter: e.target.value}))} className="w-full bg-background-elevated border border-border-color rounded-md shadow-sm pl-3 pr-10 py-2 text-left text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm">
                        <option value="">Focus Quarter...</option>
                        {sortedQuarters.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                </div>
            </div>
        </header>
    );
};

export default Header;