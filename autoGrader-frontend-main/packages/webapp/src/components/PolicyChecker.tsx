import { useState } from 'react';

interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  robotsInfo?: {
    allowed: boolean;
    crawlDelay: number;
    disallowedPaths: string[];
  };
  rateLimitInfo?: {
    remaining: number;
    waitTime: number;
  };
}

interface PolicyCheckerProps {
  url: string;
  onCheckComplete?: (result: PolicyCheckResult) => void;
}

export default function PolicyChecker({ url, onCheckComplete }: PolicyCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<PolicyCheckResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkPolicy = async () => {
    if (!url) return;

    setChecking(true);
    setResult(null);

    try {
      const response = await fetch('/api/check-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, respectRobots: true }),
      });

      const data = await response.json();
      setResult(data);
      
      if (onCheckComplete) {
        onCheckComplete(data);
      }
    } catch (error) {
      console.error('Policy check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!result) {
    return (
      <button
        onClick={checkPolicy}
        disabled={checking || !url}
        className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-sm font-medium"
      >
        {checking ? '⏳ جاري التحقق من السياسة...' : '🔍 التحقق من سياسة الموقع'}
      </button>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      result.allowed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
    }`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {result.allowed ? '✅' : '❌'}
          </span>
          <div>
            <h3 className="font-semibold text-gray-800">
              {result.allowed ? 'مسموح بالاستخراج' : 'غير مسموح بالاستخراج'}
            </h3>
            {result.reason && (
              <p className="text-sm text-gray-600">{result.reason}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
        </button>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">⚠️ تحذيرات:</h4>
          <ul className="space-y-1">
            {result.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          {/* Robots.txt Info */}
          {result.robotsInfo && (
            <div className="bg-white rounded p-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                📋 معلومات robots.txt
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة:</span>
                  <span className={result.robotsInfo.allowed ? 'text-green-600' : 'text-red-600'}>
                    {result.robotsInfo.allowed ? 'مسموح' : 'محظور'}
                  </span>
                </div>
                {result.robotsInfo.crawlDelay > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">التأخير المطلوب:</span>
                    <span className="text-gray-800">
                      {result.robotsInfo.crawlDelay / 1000} ثانية
                    </span>
                  </div>
                )}
                {result.robotsInfo.disallowedPaths.length > 0 && (
                  <div>
                    <span className="text-gray-600">المسارات المحظورة:</span>
                    <ul className="mt-1 space-y-1">
                      {result.robotsInfo.disallowedPaths.slice(0, 5).map((path, index) => (
                        <li key={index} className="text-gray-500 text-xs" dir="ltr">
                          {path}
                        </li>
                      ))}
                      {result.robotsInfo.disallowedPaths.length > 5 && (
                        <li className="text-gray-400 text-xs">
                          ... و {result.robotsInfo.disallowedPaths.length - 5} مسار آخر
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rate Limit Info */}
          {result.rateLimitInfo && (
            <div className="bg-white rounded p-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                ⏱️ معلومات معدل الطلبات
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">الطلبات المتبقية:</span>
                  <span className="text-gray-800 font-medium">
                    {result.rateLimitInfo.remaining}
                  </span>
                </div>
                {result.rateLimitInfo.waitTime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">وقت الانتظار:</span>
                    <span className="text-gray-800">
                      {Math.ceil(result.rateLimitInfo.waitTime / 1000)} ثانية
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recheck Button */}
      <button
        onClick={checkPolicy}
        disabled={checking}
        className="w-full mt-3 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"
      >
        🔄 إعادة التحقق
      </button>
    </div>
  );
}
