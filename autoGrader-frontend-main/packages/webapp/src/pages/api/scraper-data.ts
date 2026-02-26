/**
 * API Endpoint لاستقبال البيانات من Extension
 * يستقبل البيانات المستخرجة ويخزنها لعرضها في Dashboard
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// تخزين آخر payload من الإضافة (في الذاكرة) لعرضه في الداشبورد
let lastReceivedPayload: Record<string, unknown> | null = null;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            payload: lastReceivedPayload,
            message: lastReceivedPayload
                ? 'Last extension payload'
                : 'No data received yet from extension'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const data = req.body;

        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid data format'
            });
        }

        const items = Array.isArray(data.data) ? data.data : [];
        lastReceivedPayload = {
            ...data,
            data: data.data,
            statistics: data.statistics || {
                totalItems: items.length,
                totalFields: data.statistics?.totalFields ?? 0,
                fieldCounts: data.statistics?.fieldCounts || {}
            },
            receivedAt: new Date().toISOString()
        };

        console.log('📥 Received data from scraper extension:', {
            source: data.source,
            url: data.url,
            totalItems: items.length,
            timestamp: data.timestamp
        });

        return res.status(200).json({
            success: true,
            message: 'Data received successfully',
            data: {
                itemsReceived: items.length,
                timestamp: new Date().toISOString(),
                source: data.source || 'web-scraper'
            }
        });
    } catch (error) {
        console.error('❌ Error processing scraper data:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
