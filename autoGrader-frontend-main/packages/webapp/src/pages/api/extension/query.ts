/**
 * API Endpoint لاستعلام بيانات الإضافة (Extension Data Query)
 * مشابه لـ /api/moodle/query لكن يقرأ من بيانات الإضافة المستخرجة
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api/auth-middleware';

// استيراد البيانات من scraper-data endpoint
import scraperDataHandler from '../scraper-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Authentication check (bypassed in development)
    const authResult = await requireAuth(req, res);
    if (!authResult) return;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { query, transformationType } = req.body;

        // Get extension data from scraper-data
        const extensionData = await getExtensionData();

        if (!extensionData || !extensionData.data || extensionData.data.length === 0) {
            console.log('⚠️ No extension data available');
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No data available from extension'
            });
        }

        // Transform extension data based on query type
        const transformedData = transformExtensionData(
            extensionData.data,
            query,
            transformationType
        );

        console.log('✅ Extension query successful:', {
            originalItems: extensionData.data.length,
            transformedItems: transformedData.length,
            transformationType: transformationType || 'default'
        });

        return res.status(200).json({
            success: true,
            data: transformedData,
            metadata: {
                source: 'extension',
                originalUrl: extensionData.url,
                pageTitle: extensionData.pageTitle,
                totalItems: transformedData.length,
                timestamp: extensionData.receivedAt || extensionData.timestamp
            }
        });
    } catch (error) {
        console.error('❌ Extension query error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get extension data from scraper-data module
 */
async function getExtensionData() {
    try {
        // Access the lastReceivedPayload from scraper-data
        // We need to make a mock request to get the data
        const mockReq = { method: 'GET' } as NextApiRequest;
        let capturedData: any = null;

        const mockRes = {
            status: (code: number) => ({
                json: (data: any) => {
                    capturedData = data.payload;
                    return mockRes;
                },
                end: () => mockRes
            }),
            setHeader: () => mockRes,
        } as any;

        await scraperDataHandler(mockReq, mockRes);
        return capturedData;
    } catch (error) {
        console.error('Error accessing extension data:', error);
        return null;
    }
}

/**
 * Transform extension data to match workflow expectations
 */
function transformExtensionData(
    data: any[],
    query?: string,
    transformationType?: string
): any[] {
    if (!data || data.length === 0) return [];

    try {
        // Default transformation: student assignments
        if (transformationType === 'assignments' || !transformationType) {
            return transformToAssignments(data);
        }

        // Quiz/exam transformation
        if (transformationType === 'quiz') {
            return transformToQuizzes(data);
        }

        // Generic student data
        if (transformationType === 'students') {
            return transformToStudents(data);
        }

        // Raw data
        return data;
    } catch (error) {
        console.error('Transformation error:', error);
        return data; // Return raw data on error
    }
}

/**
 * Transform to assignment format
 */
function transformToAssignments(data: any[]): any[] {
    return data.map((item, index) => ({
        student_id: item.id || `student_${index + 1}`,
        student_name: item.fieldName || item.name || `Student ${index + 1}`,
        assignment_name: item.type || 'Extension Assignment',
        assignment_text: item.value || '',
        submission_id: `ext_submission_${index + 1}`,
        submission_date: new Date().toISOString(),
        status: 'submitted',
        metadata: item.metadata || {}
    }));
}

/**
 * Transform to quiz format
 */
function transformToQuizzes(data: any[]): any[] {
    return data.map((item, index) => ({
        student_id: item.id || `student_${index + 1}`,
        student_name: item.fieldName || item.name || `Student ${index + 1}`,
        quiz_name: item.type || 'Extension Quiz',
        answer: item.value || '',
        quiz_id: `ext_quiz_${index + 1}`,
        attempt_date: new Date().toISOString(),
        status: 'completed',
        metadata: item.metadata || {}
    }));
}

/**
 * Transform to student data format
 */
function transformToStudents(data: any[]): any[] {
    return data.map((item, index) => ({
        id: item.id || `student_${index + 1}`,
        name: item.fieldName || item.name || `Student ${index + 1}`,
        value: item.value || '',
        type: item.type || 'unknown',
        metadata: item.metadata || {}
    }));
}
