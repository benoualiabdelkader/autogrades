import { useState } from 'react';
import Head from 'next/head';
import ScraperInterface from '@/components/ScraperInterface';

export default function WebScraperPage() {
  return (
    <>
      <Head>
        <title>أداة استخراج البيانات - Web Scraper</title>
        <meta name="description" content="أداة تجريبية لاستخراج البيانات من المواقع" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🔍 أداة استخراج البيانات
            </h1>
            <p className="text-gray-600">
              استخرج البيانات من أي موقع ويب باستخدام Playwright
            </p>
          </div>
          
          <ScraperInterface />
        </div>
      </div>
    </>
  );
}
