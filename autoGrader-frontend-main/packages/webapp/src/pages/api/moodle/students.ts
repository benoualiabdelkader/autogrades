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

    const query = `
      SELECT
        u.id,
        CONCAT(u.firstname, ' ', u.lastname) as name,
        CONCAT(UPPER(LEFT(u.firstname, 1)), UPPER(LEFT(u.lastname, 1))) as initials,
        c.fullname as course,
        gg.finalgrade,
        u.lastaccess,
        CASE
          WHEN gg.finalgrade < 50 THEN 'CRITICAL'
          WHEN gg.finalgrade < 70 THEN 'WARNING'
          ELSE 'GOOD'
        END as status
      FROM ${prefix}user u
      JOIN ${prefix}grade_grades gg ON u.id = gg.userid
      JOIN ${prefix}grade_items gi ON gg.itemid = gi.id
      JOIN ${prefix}course c ON gi.courseid = c.id
      WHERE u.deleted = 0
        AND gg.finalgrade IS NOT NULL
        AND gg.finalgrade < 70
      ORDER BY gg.finalgrade ASC
      LIMIT 10
    `;

    const [rows]: any = await connection.execute(query);
    const students = (rows || []).map((row: any) => {
      const engagement = calculateEngagement(Number(row.lastaccess || 0));
      const color = row.status === 'CRITICAL' ? 'red' : 'orange';
      const grade = formatGrade(Number(row.finalgrade || 0));

      return {
        id: row.id,
        name: row.name,
        initials: row.initials,
        course: row.course,
        engagement,
        finalgrade: row.finalgrade,
        grade,
        status: row.status,
        color,
        lastaccess: row.lastaccess
      };
    });

    return res.status(200).json({
      success: true,
      students,
      total: students.length
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch students'
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

function calculateEngagement(lastaccess: number): number {
  const now = Date.now() / 1000;
  const daysSinceAccess = (now - lastaccess) / (60 * 60 * 24);

  if (daysSinceAccess < 1) return 90;
  if (daysSinceAccess < 3) return 70;
  if (daysSinceAccess < 7) return 50;
  if (daysSinceAccess < 14) return 30;
  return 10;
}

function formatGrade(grade: number): string {
  if (grade >= 90) return 'A';
  if (grade >= 80) return 'B';
  if (grade >= 70) return 'C';
  if (grade >= 60) return 'D';
  if (grade >= 50) return 'D-';
  return 'F (Risk)';
}
