/**
 * API Endpoint لاستقبال البيانات من Extension
 * يستقبل البيانات المستخرجة ويخزنها لعرضها في Dashboard
 * 
 * Fix: Uses globalThis to persist data across Next.js HMR reloads
 * Also writes to a .json file as backup for full server restarts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// ─── Persist across HMR (Hot Module Replacement) ───
// In Next.js dev mode, module-level variables get reset on file changes.
// globalThis survives HMR reloads (same pattern as Prisma client).
const globalForStorage = globalThis as typeof globalThis & {
    __scraperPayload?: Record<string, unknown> | null;
};

// File-based backup for full server restarts
const BACKUP_FILE = path.join(process.cwd(), '.scraper-data-cache.json');

function getPayload(): Record<string, unknown> | null {
    // 1. Try globalThis (fastest, survives HMR)
    if (globalForStorage.__scraperPayload) {
        return globalForStorage.__scraperPayload;
    }
    // 2. Try file backup (survives server restart)
    try {
        if (fs.existsSync(BACKUP_FILE)) {
            const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            // Cache in globalThis for next time
            globalForStorage.__scraperPayload = parsed;
            return parsed;
        }
    } catch (e) {
        console.warn('Could not read scraper data cache:', e);
    }
    return null;
}

function setPayload(data: Record<string, unknown> | null): void {
    // 1. Store in globalThis (survives HMR)
    globalForStorage.__scraperPayload = data;
    // 2. Write file backup (survives server restart)
    try {
        if (data) {
            fs.writeFileSync(BACKUP_FILE, JSON.stringify(data), 'utf-8');
        }
    } catch (e) {
        console.warn('Could not write scraper data cache:', e);
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Source');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method === 'GET') {
        const payload = getPayload();
        return res.status(200).json({
            success: true,
            payload: payload,
            hasData: !!payload,
            message: payload
                ? 'Last extension payload'
                : 'No data received yet from extension'
        });
    }

    // DELETE - clear stored data
    if (req.method === 'DELETE') {
        setPayload(null);
        try { fs.unlinkSync(BACKUP_FILE); } catch {}
        return res.status(200).json({ success: true, message: 'Data cleared' });
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

        // Normalize: support both {data: [...]} and direct array formats
        let items: any[] = [];
        if (Array.isArray(data.data)) {
            items = data.data;
        } else if (Array.isArray(data)) {
            items = data;
        }

        const payload: Record<string, unknown> = {
            source: data.source || 'web-scraper',
            url: data.url || '',
            pageTitle: data.pageTitle || '',
            timestamp: data.timestamp || new Date().toISOString(),
            data: items,
            statistics: data.statistics || {
                totalItems: items.length,
                totalFields: data.statistics?.totalFields ?? 0,
                fieldCounts: data.statistics?.fieldCounts || {}
            },
            receivedAt: new Date().toISOString()
        };

        setPayload(payload);

        console.log('📥 Received data from scraper extension:', {
            source: data.source,
            url: data.url,
            totalItems: items.length,
            timestamp: data.timestamp,
            storedIn: 'globalThis + file'
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
