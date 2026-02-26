import { useState, useEffect } from 'react';
import ScraperStats from './ScraperStats';
import DataPreview from './DataPreview';
import PolicyChecker from './PolicyChecker';

interface ScrapedData {
  title?: string;
  content?: string;
  links?: string[];
  images?: string[];
  metadata?: any;
  screenshot?: string;
  elements?: any[];
  timestamp?: string;
}

interface HistoryItem {
  id: string;
  url: string;
  type: string;
  timestamp: string;
  data: ScrapedData;
}

interface AdvancedOptions {
  waitForSelector?: string;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  javascript?: boolean;
}

export default function ScraperInterface() {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScrapedData | null>(null);
  const [error, setError] = useState('');
  const [scrapeType, setScrapeType] = useState<'basic' | 'advanced' | 'screenshot'>('basic');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    timeout: 30000,
    javascript: true,
  });
  const [multiPageUrls, setMultiPageUrls] = useState<string>('');
  const [isMultiPage, setIsMultiPage] = useState(false);
  const [showPolicyCheck, setShowPolicyCheck] = useState(false);
  const [policyCheckPassed, setPolicyCheckPassed] = useState(false);
  const [respectRobots, setRespectRobots] = useState(true);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('scraper-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save to history
  const saveToHistory = (scrapedData: ScrapedData) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      url,
      type: scrapeType,
      timestamp: new Date().toISOString(),
      data: scrapedData,
    };
    const updatedHistory = [newItem, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem('scraper-history', JSON.stringify(updatedHistory));
  };

  const handleScrape = async () => {
    if (!url && !isMultiPage) {
      setError('الرجاء إدخال رابط الموقع');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const urls = isMultiPage 
        ? multiPageUrls.split('\n').filter(u => u.trim())
        : [url];

      if (urls.length === 0) {
        throw new Error('الرجاء إدخال رابط واحد على الأقل');
      }

      const allResults: any[] = [];

      for (const targetUrl of urls) {
        const response = await fetch('/api/scraper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: targetUrl.trim(),
            selector: selector || undefined,
            type: scrapeType,
            respectRobots: respectRobots,
            options: advancedOptions,
          }),
        });

        if (!response.ok) {
          throw new Error(`فشل في استخراج البيانات من ${targetUrl}`);
        }

        const result = await response.json();
        allResults.push({ url: targetUrl, ...result.data });
      }

      const finalData = isMultiPage 
        ? { multiPage: true, results: allResults, timestamp: new Date().toISOString() }
        : { ...allResults[0], timestamp: new Date().toISOString() };

      setData(finalData);
      saveToHistory(finalData);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء استخراج البيانات');
    } finally {
      setLoading(false);
    }
  };

  const exportData = (format: 'json' | 'csv' | 'txt') => {
    if (!data) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `scrape-${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      // Convert to CSV
      const rows: string[][] = [];
      if (data.links) {
        rows.push(['Type', 'Value']);
        data.links.forEach(link => rows.push(['Link', link]));
      }
      content = rows.map(row => row.join(',')).join('\n');
      filename = `scrape-${Date.now()}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'txt') {
      content = `Title: ${data.title || 'N/A'}\n\nContent:\n${data.content || 'N/A'}`;
      filename = `scrape-${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUrl(item.url);
    setScrapeType(item.type as any);
    setData(item.data);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scraper-history');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-2"
          >
            📜 السجل ({history.length})
          </button>
          <button
            onClick={() => setIsMultiPage(!isMultiPage)}
            className={`px-4 py-2 rounded-lg shadow hover:shadow-md transition-shadow ${
              isMultiPage ? 'bg-blue-500 text-white' : 'bg-white'
            }`}
          >
            🔗 صفحات متعددة
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">📜 السجل التاريخي</h3>
            <button
              onClick={clearHistory}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              مسح الكل
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا يوجد سجل</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 truncate" dir="ltr">
                        {item.url}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.type} • {new Date(item.timestamp).toLocaleString('ar')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="space-y-4">
          {/* URL Input or Multi-page */}
          {!isMultiPage ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط الموقع (URL)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="ltr"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                روابط متعددة (كل رابط في سطر)
              </label>
              <textarea
                value={multiPageUrls}
                onChange={(e) => setMultiPageUrls(e.target.value)}
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                dir="ltr"
              />
            </div>
          )}

          {/* Scrape Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الاستخراج
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setScrapeType('basic')}
                className={`px-4 py-2 rounded-lg ${
                  scrapeType === 'basic'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                أساسي
              </button>
              <button
                onClick={() => setScrapeType('advanced')}
                className={`px-4 py-2 rounded-lg ${
                  scrapeType === 'advanced'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                متقدم
              </button>
              <button
                onClick={() => setScrapeType('screenshot')}
                className={`px-4 py-2 rounded-lg ${
                  scrapeType === 'screenshot'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                لقطة شاشة
              </button>
            </div>
          </div>

          {/* Selector Input (for advanced) */}
          {scrapeType === 'advanced' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSS Selector (اختياري)
              </label>
              <input
                type="text"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder=".article-content, #main, h1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="ltr"
              />
            </div>
          )}

          {/* Advanced Options Toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showAdvanced ? '▼' : '▶'} خيارات متقدمة
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المهلة الزمنية (ms)
                  </label>
                  <input
                    type="number"
                    value={advancedOptions.timeout}
                    onChange={(e) => setAdvancedOptions({
                      ...advancedOptions,
                      timeout: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    انتظار عنصر
                  </label>
                  <input
                    type="text"
                    value={advancedOptions.waitForSelector || ''}
                    onChange={(e) => setAdvancedOptions({
                      ...advancedOptions,
                      waitForSelector: e.target.value
                    })}
                    placeholder=".content"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={advancedOptions.javascript}
                    onChange={(e) => setAdvancedOptions({
                      ...advancedOptions,
                      javascript: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">تفعيل JavaScript</span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={respectRobots}
                    onChange={(e) => setRespectRobots(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">احترام robots.txt</span>
                </label>
              </div>
            </div>
          )}

          {/* Policy Check Section */}
          {url && !isMultiPage && (
            <div>
              <button
                onClick={() => setShowPolicyCheck(!showPolicyCheck)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
              >
                {showPolicyCheck ? '▼' : '▶'} التحقق من سياسة الموقع
              </button>
              {showPolicyCheck && (
                <PolicyChecker
                  url={url}
                  onCheckComplete={(result) => setPolicyCheckPassed(result.allowed)}
                />
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleScrape}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '⏳ جاري الاستخراج...' : '🚀 ابدأ الاستخراج'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {data && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              📊 النتائج
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportData('json')}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                📥 JSON
              </button>
              <button
                onClick={() => exportData('csv')}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                📥 CSV
              </button>
              <button
                onClick={() => exportData('txt')}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                📥 TXT
              </button>
            </div>
          </div>

          {/* Multi-page Results */}
          {(data as any).multiPage && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                نتائج الصفحات المتعددة ({(data as any).results?.length})
              </h3>
              <div className="space-y-4">
                {(data as any).results?.map((result: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-blue-600 mb-2" dir="ltr">
                      {result.url}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">العنوان:</span>
                        <p className="font-medium truncate">{result.title || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">الروابط:</span>
                        <p className="font-medium">{result.links?.length || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">الصور:</span>
                        <p className="font-medium">{result.images?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {data.timestamp && (
            <div className="mb-4 text-sm text-gray-500">
              ⏰ تم الاستخراج: {new Date(data.timestamp).toLocaleString('ar')}
            </div>
          )}

          {/* Stats */}
          {!(data as any).multiPage && <ScraperStats data={data} />}

          {/* Screenshot */}
          {data.screenshot && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                لقطة الشاشة
              </h3>
              <img
                src={data.screenshot}
                alt="Screenshot"
                className="w-full border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {/* Data Preview Component */}
          {!(data as any).multiPage && !data.screenshot && (
            <DataPreview data={data} />
          )}
        </div>
      )}
    </div>
  );
}
