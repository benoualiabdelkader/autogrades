import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { parseMoodleConfig, sameOriginRequest } from '@/lib/api/moodle-security';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sameOriginRequest(req)) {
    return res.status(403).json({
      success: false,
      error: 'Cross-origin requests are blocked'
    });
  }

  let connection;

  try {
    const { host, port, database, user, password, prefix } = parseMoodleConfig(req);

    // Validate required fields
    if (!host || !database || !user || !prefix) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        success: false 
      });
    }

    // Create database connection
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password: password || '',
      database
    });

    // Test connection with a simple query
    const [userRows]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM ${prefix}user WHERE deleted = 0`
    );
    const totalUsers = userRows[0]?.count || 0;

    // Get total courses
    const [courseRows]: any = await connection.execute(
      `SELECT COUNT(*) as count FROM ${prefix}course WHERE visible = 1`
    );
    const totalCourses = courseRows[0]?.count || 0;

    // Get active sessions (last 30 minutes)
    const [sessionRows]: any = await connection.execute(
      `SELECT COUNT(DISTINCT userid) as count FROM ${prefix}sessions 
       WHERE timemodified > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE))`
    );
    const activeSessions = sessionRows[0]?.count || 0;

    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'Connected to Moodle database successfully',
      stats: {
        totalUsers: totalUsers,
        totalCourses: totalCourses,
        activeSessions: activeSessions
      },
      config: {
        dbhost: host,
        dbport: String(port),
        dbname: database,
        prefix
      }
    });

  } catch (error: any) {
    console.error('Database connection error:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return res.status(500).json({ 
      error: 'Failed to connect to database',
      message: error.message,
      code: error.code,
      success: false 
    });
  }
}
