interface ScraperStatsProps {
  data: any;
}

export default function ScraperStats({ data }: ScraperStatsProps) {
  if (!data) return null;

  const stats = {
    title: data.title ? '✓' : '✗',
    content: data.content ? data.content.length : 0,
    links: data.links?.length || 0,
    images: data.images?.length || 0,
    elements: data.elements?.length || 0,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
        <div className="text-3xl mb-1">{stats.title}</div>
        <div className="text-sm text-gray-600">العنوان</div>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
        <div className="text-3xl font-bold mb-1">{stats.content}</div>
        <div className="text-sm text-gray-600">حرف</div>
      </div>
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
        <div className="text-3xl font-bold mb-1">{stats.links}</div>
        <div className="text-sm text-gray-600">رابط</div>
      </div>
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
        <div className="text-3xl font-bold mb-1">{stats.images}</div>
        <div className="text-sm text-gray-600">صورة</div>
      </div>
      <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg">
        <div className="text-3xl font-bold mb-1">{stats.elements}</div>
        <div className="text-sm text-gray-600">عنصر</div>
      </div>
    </div>
  );
}
