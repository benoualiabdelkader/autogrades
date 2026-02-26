import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { parseMoodleConfig, sameOriginRequest } from '@/lib/api/moodle-security';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!sameOriginRequest(req)) {
    return res.status(403).json({
      success: false,
      error: 'Cross-origin requests are blocked'
    });
  }

  const { host, port, database, user, password, prefix } = parseMoodleConfig(req);
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 7000
    });

    const [riskRows]: any = await connection.execute(`
      SELECT COUNT(*) as count
      FROM ${prefix}user u
      JOIN ${prefix}grade_grades gg ON u.id = gg.userid
      WHERE u.deleted = 0 AND gg.finalgrade < 70
    `);
    const studentsAtRisk = Number(riskRows[0]?.count || 0);

    const [totalStudentsRows]: any = await connection.execute(`
      SELECT COUNT(*) as count FROM ${prefix}user WHERE deleted = 0
    `);
    const totalStudents = Number(totalStudentsRows[0]?.count || 0);

    const [coursesRows]: any = await connection.execute(`
      SELECT COUNT(*) as count FROM ${prefix}course WHERE visible = 1
    `);
    const totalCourses = Number(coursesRows[0]?.count || 0);

    const [sessionsRows]: any = await connection.execute(`
      SELECT COUNT(DISTINCT userid) as count FROM ${prefix}sessions
      WHERE timemodified > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE))
    `);
    const activeSessions = Number(sessionsRows[0]?.count || 0);

    const [engagementRows]: any = await connection.execute(`
      SELECT COUNT(DISTINCT userid) as count FROM ${prefix}logstore_standard_log
      WHERE timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY))
    `);
    const activeUsers = Number(engagementRows[0]?.count || 0);
    const engagementRate = totalStudents > 0 ? Math.round((activeUsers / totalStudents) * 100) : 0;

    const [avgGradeRows]: any = await connection.execute(`
      SELECT AVG(finalgrade) as avg FROM ${prefix}grade_grades WHERE finalgrade IS NOT NULL
    `);
    const averageGrade = Math.round(Number(avgGradeRows[0]?.avg || 0));

    const [completionRows]: any = await connection.execute(`
      SELECT
        COUNT(DISTINCT cc.userid) as completed,
        COUNT(DISTINCT ue.userid) as total
      FROM ${prefix}enrol e
      JOIN ${prefix}user_enrolments ue ON e.id = ue.enrolid
      LEFT JOIN ${prefix}course_completions cc ON ue.userid = cc.userid AND cc.timecompleted IS NOT NULL
    `);
    const completionData = completionRows[0] || {};
    const completed = Number(completionData.completed || 0);
    const totalEnrolled = Number(completionData.total || 0);
    const courseCompletion = totalEnrolled > 0 ? Number(((completed / totalEnrolled) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        studentsAtRisk,
        engagementRate,
        courseCompletion,
        activeSessions,
        totalStudents,
        totalCourses,
        averageGrade,
        trends: {
          studentsAtRiskChange: 0,
          engagementPeakTime: 'N/A',
          completionStatus: courseCompletion > 60 ? 'On track for semester' : 'Needs attention'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const isConnectionError =
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      error?.errno === -4078;

    if (isConnectionError) {
      // قاعدة البيانات غير متاحة (غير مشغّلة أو عنوان خاطئ) — نرجع 200 حتى لا يظهر خطأ 500 في الواجهة
      return res.status(200).json({
        success: false,
        error: 'Database not available. Start MySQL or check connection settings.',
        stats: null,
        timestamp: new Date().toISOString()
      });
    }

    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch stats',
      timestamp: new Date().toISOString()
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Ignore connection cleanup errors.
      }
    }
  }
}
