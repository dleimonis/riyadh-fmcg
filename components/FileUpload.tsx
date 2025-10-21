import React, { useCallback, useState } from 'react';
import Papa, { ParseResult, ParseError } from 'papaparse';
import type { DataValidation, RawDataRow } from '../types';
import { UploadCloudIcon, CheckCircleIcon, AlertTriangleIcon, FileIcon } from './ui/Icons';
import { processFinancialData } from '../services/dataProcessor';

interface FileUploadProps {
  onDataProcessed: (processedData: ReturnType<typeof processFinancialData>, validation: DataValidation) => void;
  initialError: string | null;
}

const REQUIRED_COLUMNS = ['Quarter', 'Year', 'Revenue', 'COGS', 'OPEX'];
const CSV_HEADER_TEMPLATE = "Quarter,Year,Region,Product,Revenue,COGS,OPEX,Non_Cash_Adjustments,Net Income,Plan_Revenue,Plan_COGS,Plan_OPEX";

const FileUpload: React.FC<FileUploadProps> = ({ onDataProcessed, initialError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(initialError);
    const [validation, setValidation] = useState<DataValidation | null>(null);
    const [parsedData, setParsedData] = useState<ParseResult<RawDataRow> | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const resetState = () => {
        setError(null);
        setValidation(null);
        setParsedData(null);
        setFileName(null);
    };

    const handleFile = useCallback((file: File) => {
        if (file && (file.type === "text/csv" || file.name.endsWith('.csv'))) {
            resetState();
            setFileName(file.name);
            Papa.parse<RawDataRow>(file, {
                header: true,
                skipEmptyLines: 'greedy',
                complete: (results: ParseResult<RawDataRow>) => {
                    const headers = results.meta.fields;
                    if (!headers) {
                         setError(`Invalid CSV: Could not detect headers.`);
                         return;
                    }
                    const missingCols = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

                    if (missingCols.length > 0) {
                        setError(`Missing required columns: ${missingCols.join(', ')}. Please check your CSV file.`);
                        return;
                    }

                    const rowCount = results.data.length;
                    // FIX: Explicitly type sort arguments as 'number' to allow subtraction.
                    const yearsDetected = [...new Set(results.data.map((r: RawDataRow): number => parseInt(r.Year, 10)).filter(y => !isNaN(y)))].sort((a: number,b: number)=> a-b);
                    const missingValues: { [key: string]: number } = {};
                    REQUIRED_COLUMNS.forEach(col => {
                        missingValues[col] = results.data.filter((r: any) => r[col] === undefined || r[col] === null || String(r[col]).trim() === '').length;
                    });
                    const hasPlanData = headers.includes('Plan_Revenue');

                    const validationResult: DataValidation = { rowCount, yearsDetected, missingValues, hasPlanData };
                    setValidation(validationResult);
                    setParsedData(results);
                },
                error: (err: ParseError) => {
                    setError(`CSV Parsing Error: ${err.message}`);
                }
            });
        } else {
            setError("Please upload a valid CSV file.");
        }
    }, []);
    
    const handleProceed = () => {
        if (!parsedData || !validation) return;
        try {
            const processed = processFinancialData(parsedData.data);
            onDataProcessed(processed, validation);
        } catch(e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred during data processing.');
            }
        }
    };

    const dragDropHandlers = {
        onDragEnter: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); },
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault(); e.stopPropagation(); setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        },
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };
    
    // FIX: Explicitly type reduce arguments to prevent TS from inferring them as 'unknown'.
    const totalMissing = validation ? Object.values(validation.missingValues).reduce((sum: number, count: number) => sum + count, 0) : 0;

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary">Quarterly Performance Report</h1>
                    <p className="mt-2 text-text-muted">An interactive dashboard for FMCG financial analysis.</p>
                </div>

                <div className="bg-background-elevated rounded-xl shadow-lg p-8">
                    {!validation ? (
                        <>
                            <div {...dragDropHandlers} className={`relative p-10 border-2 border-dashed rounded-lg transition-colors duration-200 ${isDragging ? 'border-primary bg-indigo-50 dark:bg-indigo-900/20' : 'border-border-color'}`}>
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv" onChange={handleFileChange} />
                                <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
                                    <UploadCloudIcon className="w-12 h-12 text-gray-400" />
                                    <p className="text-text-primary"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-text-muted">CSV file required</p>
                                </label>
                            </div>
                             {error && <div className="mt-4 p-4 text-sm bg-danger-bg text-danger-text rounded-lg flex items-start gap-2"><AlertTriangleIcon className="h-5 w-5 flex-shrink-0" /><div><span className="font-semibold">Upload Error:</span> {error}</div></div>}
                            <div className="text-left mt-6 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                <h3 className="font-semibold text-md text-text-primary mb-2">CSV Format</h3>
                                <p className="text-sm text-text-muted mb-3">Must include required headers: <code className="text-xs">Quarter, Year, Revenue, COGS, OPEX</code>.</p>
                                <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded text-xs font-mono text-text-muted break-all">{CSV_HEADER_TEMPLATE}</div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-semibold text-center text-text-primary">Validation Summary</h2>
                            <div className="mt-6 space-y-4">
                               <div className="flex items-center p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                    <FileIcon className="h-6 w-6 text-primary mr-3" />
                                    <span className="font-medium text-text-primary truncate">{fileName}</span>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                    <div className="p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{validation.rowCount}</p>
                                        <p className="text-sm text-text-muted">Rows Processed</p>
                                    </div>
                                    <div className="p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{validation.yearsDetected.join(', ')}</p>
                                        <p className="text-sm text-text-muted">Years Detected</p>
                                    </div>
                               </div>
                                <div className={`p-4 rounded-lg flex items-center gap-3 ${totalMissing > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                                    {totalMissing > 0 ? <AlertTriangleIcon className="h-6 w-6"/> : <CheckCircleIcon className="h-6 w-6"/>}
                                    <div>
                                        <p className="font-semibold">{totalMissing > 0 ? `${totalMissing} Missing Values Found` : 'All Required Data Present'}</p>
                                        <p className="text-sm">{totalMissing > 0 ? 'Analysis will proceed, but results may be incomplete.' : 'Plan data was ' + (validation.hasPlanData ? 'detected.' : 'not detected.')}</p>
                                    </div>
                               </div>
                               {error && <div className="mt-4 p-4 text-sm bg-danger-bg text-danger-text rounded-lg flex items-start gap-2"><AlertTriangleIcon className="h-5 w-5 flex-shrink-0" /><div><span className="font-semibold">Processing Error:</span> {error}</div></div>}
                            </div>
                            <div className="mt-8 flex justify-between items-center">
                                <button onClick={resetState} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary">Upload another file</button>
                                <button onClick={handleProceed} className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors" disabled={!!error}>View Dashboard &rarr;</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUpload;