/**
 * Scraper Data Dashboard Component
 * لوحة عرض البيانات المستخرجة من Extension
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload,
    faRefresh,
    faTable,
    faChartBar,
    faFileExport,
    faTrash
} from '@fortawesome/free-solid-svg-icons';

interface ScraperData {
    source: string;
    timestamp: string;
    url: string;
    pageTitle: string;
    data: Array<{
        id: string;
        fieldName: string;
        value: string;
        type: string;
        metadata: any;
    }>;
    statistics: {
        totalItems: number;
        totalFields: number;
        fieldCounts: Record<string, number>;
    };
    metadata: any;
}

export default function ScraperDataDashboard() {
    const [scraperData, setScraperData] = useState<ScraperData[]>([]);
    const [selectedData, setSelectedData] = useState<ScraperData | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadScraperData();
    }, []);

    const loadScraperData = () => {
        try {
            const stored = localStorage.getItem('scraper_data_history');
            if (stored) {
                const data = JSON.parse(stored);
                setScraperData(data);
                if (data.length > 0) {
                    setSelectedData(data[0]);
                }
            }
        } catch (error) {
            console.error('Error loading scraper data:', error);
        }
    };

    const checkForNewData = () => {
        // يمكن إضافة منطق للتحقق من البيانات الجديدة من الخادم
    };

    const handleRefresh = () => {
        setLoading(true);
        loadScraperData();
        setTimeout(() => setLoading(false), 500);
    };

    const handleExportCSV = () => {
        if (!selectedData) return;

        const headers = ['Field Name', 'Value', 'Type'];
        const rows = selectedData.data.map(item => [
            item.fieldName,
            item.value,
            item.type
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scraper_data_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = () => {
        if (!selectedData) return;

        const json = JSON.stringify(selectedData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scraper_data_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleClearData = () => {
        if (confirm('هل أنت متأكد من حذف جميع البيانات؟')) {
            localStorage.removeItem('scraper_data_history');
            setScraperData([]);
            setSelectedData(null);
        }
    };

    const groupDataByField = () => {
        if (!selectedData) return {};

        const grouped: Record<string, any[]> = {};

        selectedData.data.forEach(item => {
            if (!grouped[item.fieldName]) {
                grouped[item.fieldName] = [];
            }
            grouped[item.fieldName].push(item);
        });

        return grouped;
    };

    return (
        <div className="scraper-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h2 className="text-2xl font-bold premium-text-gradient">
                        بيانات الاستخراج الذكي
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        البيانات المستخرجة من Extension
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="btn-icon"
                        disabled={loading}
                        title="تحديث"
                    >
                        <FontAwesomeIcon
                            icon={faRefresh as any}
                            className={loading ? 'animate-spin' : ''}
                        />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn-icon"
                        disabled={!selectedData}
                        title="تصدير CSV"
                    >
                        <FontAwesomeIcon icon={faDownload as any} />
                    </button>
                    <button
                        onClick={handleExportJSON}
                        className="btn-icon"
                        disabled={!selectedData}
                        title="تصدير JSON"
                    >
                        <FontAwesomeIcon icon={faFileExport as any} />
                    </button>
                    <button
                        onClick={handleClearData}
                        className="btn-icon text-red-500"
                        disabled={scraperData.length === 0}
                        title="مسح الكل"
                    >
                        <FontAwesomeIcon icon={faTrash as any} />
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {selectedData && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{selectedData.statistics.totalItems}</div>
                        <div className="stat-label">إجمالي العناصر</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{selectedData.statistics.totalFields}</div>
                        <div className="stat-label">عدد الحقول</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            {new Date(selectedData.timestamp).toLocaleDateString('ar')}
                        </div>
                        <div className="stat-label">تاريخ الاستخراج</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value text-sm truncate">
                            {selectedData.pageTitle}
                        </div>
                        <div className="stat-label">عنوان الصفحة</div>
                    </div>
                </div>
            )}

            {/* View Mode Toggle */}
            <div className="view-toggle">
                <button
                    className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                >
                    <FontAwesomeIcon icon={faTable as any} />
                    <span>جدول</span>
                </button>
                <button
                    className={`toggle-btn ${viewMode === 'json' ? 'active' : ''}`}
                    onClick={() => setViewMode('json')}
                >
                    <FontAwesomeIcon icon={faChartBar as any} />
                    <span>JSON</span>
                </button>
            </div>

            {/* Data Display */}
            {selectedData ? (
                <div className="data-container">
                    {viewMode === 'table' ? (
                        <div className="table-view">
                            {Object.entries(groupDataByField()).map(([fieldName, items]) => (
                                <div key={fieldName} className="field-group">
                                    <h3 className="field-title">
                                        {fieldName}
                                        <span className="field-count">({items.length})</span>
                                    </h3>
                                    <div className="field-items">
                                        {items.map((item, index) => (
                                            <div key={index} className="data-item">
                                                <div className="item-type">{item.type}</div>
                                                <div className="item-value">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="json-view">
                            <pre>{JSON.stringify(selectedData, null, 2)}</pre>
                        </div>
                    )}
                </div>
            ) : (
                <div className="empty-state">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                        <path d="M60 30L80 50L60 70L40 50L60 30Z" fill="currentColor" opacity="0.3" />
                        <path d="M60 50L80 70L60 90L40 70L60 50Z" fill="currentColor" opacity="0.2" />
                    </svg>
                    <h3>لا توجد بيانات</h3>
                    <p>استخدم Extension لاستخراج البيانات من أي صفحة ويب</p>
                </div>
            )}

            <style jsx>{`
                .scraper-dashboard {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .btn-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-icon:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary);
                }

                .btn-icon:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                }

                .stat-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--primary);
                    margin-bottom: 8px;
                }

                .stat-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .view-toggle {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                }

                .toggle-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }

                .toggle-btn.active {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                }

                .data-container {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 24px;
                    max-height: 600px;
                    overflow-y: auto;
                }

                .field-group {
                    margin-bottom: 24px;
                }

                .field-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .field-count {
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .field-items {
                    display: grid;
                    gap: 8px;
                }

                .data-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .item-type {
                    padding: 4px 8px;
                    background: var(--primary);
                    color: white;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .item-value {
                    flex: 1;
                    color: var(--text-primary);
                    font-size: 14px;
                }

                .json-view {
                    font-family: monospace;
                    font-size: 12px;
                    color: var(--text-primary);
                    white-space: pre-wrap;
                    word-break: break-all;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }

                .empty-state svg {
                    margin-bottom: 24px;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 24px;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }

                .empty-state p {
                    font-size: 14px;
                }
            `}</style>
        </div>
    );
}
