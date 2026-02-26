import { useState } from 'react';

interface DataPreviewProps {
  data: any;
}

export default function DataPreview({ data }: DataPreviewProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'links' | 'images' | 'metadata'>('content');
  const [searchTerm, setSearchTerm] = useState('');

  if (!data) return null;

  const filterItems = (items: string[]) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'content'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📄 المحتوى
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'links'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🔗 الروابط ({data.links?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'images'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🖼️ الصور ({data.images?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'metadata'
              ? 'bg-white border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ℹ️ البيانات الوصفية
        </button>
      </div>

      {/* Search Bar */}
      {(activeTab === 'links' || activeTab === 'images') && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 بحث..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'content' && (
          <div className="prose max-w-none">
            {data.content ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {data.content}
              </pre>
            ) : (
              <p className="text-gray-500">لا يوجد محتوى</p>
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-2">
            {data.links && data.links.length > 0 ? (
              filterItems(data.links).map((link: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                >
                  <span className="text-gray-400 text-xs">{index + 1}</span>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex-1 truncate"
                    dir="ltr"
                  >
                    {link}
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    📋
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">لا توجد روابط</p>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="grid grid-cols-2 gap-3">
            {data.images && data.images.length > 0 ? (
              filterItems(data.images).map((img: string, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={img}
                    alt={`Image ${index + 1}`}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E✗%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="p-2 bg-gray-50">
                    <p className="text-xs text-gray-600 truncate" dir="ltr">
                      {img}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-2">لا توجد صور</p>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-3">
            {data.metadata ? (
              Object.entries(data.metadata).map(([key, value]: [string, any]) => (
                <div key={key} className="border-b border-gray-200 pb-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {key}
                  </div>
                  <div className="text-sm text-gray-600">
                    {value || 'N/A'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">لا توجد بيانات وصفية</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
