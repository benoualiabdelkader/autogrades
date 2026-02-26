// Moodle Database Query Helpers
import { DatabaseConfig } from './config';

export interface MoodleStudent {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  lastaccess: number;
}

export interface MoodleCourse {
  id: number;
  fullname: string;
  shortname: string;
  category: number;
  visible: number;
  timecreated: number;
}

export interface MoodleGrade {
  id: number;
  userid: number;
  itemid: number;
  finalgrade: number;
  timemodified: number;
}

export interface StudentAnalytics {
  id: number;
  name: string;
  course: string;
  engagement: number;
  grade: string;
  status: 'CRITICAL' | 'WARNING' | 'GOOD';
  lastAccess: string;
}

// SQL Queries for Moodle
export const MoodleQueries = {
  // Get all students
  getAllStudents: (prefix: string) => `
    SELECT id, username, firstname, lastname, email, lastaccess
    FROM ${prefix}user
    WHERE deleted = 0 AND suspended = 0
    ORDER BY lastname, firstname
  `,

  // Get students at risk (low grades or low engagement)
  getAtRiskStudents: (prefix: string) => `
    SELECT 
      u.id,
      CONCAT(u.firstname, ' ', u.lastname) as name,
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
  `,

  // Get course statistics
  getCourseStats: (prefix: string) => `
    SELECT 
      c.id,
      c.fullname,
      c.shortname,
      COUNT(DISTINCT ue.userid) as enrolled_students,
      AVG(gg.finalgrade) as avg_grade
    FROM ${prefix}course c
    LEFT JOIN ${prefix}enrol e ON c.id = e.courseid
    LEFT JOIN ${prefix}user_enrolments ue ON e.id = ue.enrolid
    LEFT JOIN ${prefix}grade_items gi ON c.id = gi.courseid
    LEFT JOIN ${prefix}grade_grades gg ON gi.id = gg.itemid
    WHERE c.visible = 1
    GROUP BY c.id, c.fullname, c.shortname
    ORDER BY enrolled_students DESC
  `,

  // Get student engagement (based on log entries)
  getStudentEngagement: (prefix: string, days: number = 7) => `
    SELECT 
      u.id,
      CONCAT(u.firstname, ' ', u.lastname) as name,
      COUNT(l.id) as activity_count,
      MAX(l.timecreated) as last_activity
    FROM ${prefix}user u
    LEFT JOIN ${prefix}logstore_standard_log l ON u.id = l.userid
    WHERE l.timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL ${days} DAY))
    GROUP BY u.id, u.firstname, u.lastname
    ORDER BY activity_count DESC
  `,

  // Get assignment submissions
  getAssignmentSubmissions: (prefix: string, assignmentId: number) => `
    SELECT 
      u.id,
      CONCAT(u.firstname, ' ', u.lastname) as student_name,
      asub.status,
      asub.timemodified,
      ag.grade
    FROM ${prefix}assign_submission asub
    JOIN ${prefix}user u ON asub.userid = u.id
    LEFT JOIN ${prefix}assign_grades ag ON asub.assignment = ag.assignment AND asub.userid = ag.userid
    WHERE asub.assignment = ${assignmentId}
      AND asub.latest = 1
    ORDER BY asub.timemodified DESC
  `,

  // Get quiz attempts
  getQuizAttempts: (prefix: string, quizId: number) => `
    SELECT 
      u.id,
      CONCAT(u.firstname, ' ', u.lastname) as student_name,
      qa.attempt,
      qa.state,
      qa.sumgrades,
      qa.timefinish
    FROM ${prefix}quiz_attempts qa
    JOIN ${prefix}user u ON qa.userid = u.id
    WHERE qa.quiz = ${quizId}
    ORDER BY qa.timefinish DESC
  `,

  // Get active sessions count
  getActiveSessions: (prefix: string) => `
    SELECT COUNT(DISTINCT userid) as active_count
    FROM ${prefix}sessions
    WHERE timemodified > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE))
  `,

  // Get completion rate
  getCourseCompletion: (prefix: string, courseId: number) => `
    SELECT 
      COUNT(DISTINCT cc.userid) as completed_students,
      COUNT(DISTINCT ue.userid) as total_students,
      (COUNT(DISTINCT cc.userid) / COUNT(DISTINCT ue.userid) * 100) as completion_rate
    FROM ${prefix}course c
    JOIN ${prefix}enrol e ON c.id = e.courseid
    JOIN ${prefix}user_enrolments ue ON e.id = ue.enrolid
    LEFT JOIN ${prefix}course_completions cc ON c.id = cc.course AND ue.userid = cc.userid AND cc.timecompleted IS NOT NULL
    WHERE c.id = ${courseId}
  `
};

// Helper function to format student data for dashboard
export function formatStudentForDashboard(student: any): StudentAnalytics {
  const engagement = calculateEngagement(student);
  const status = determineStatus(student.finalgrade, engagement);
  
  return {
    id: student.id,
    name: student.name,
    course: student.course,
    engagement: engagement,
    grade: formatGrade(student.finalgrade),
    status: status,
    lastAccess: formatLastAccess(student.lastaccess)
  };
}

function calculateEngagement(student: any): number {
  // Calculate engagement based on last access and activity
  const now = Date.now() / 1000;
  const daysSinceAccess = (now - student.lastaccess) / (60 * 60 * 24);
  
  if (daysSinceAccess < 1) return 90;
  if (daysSinceAccess < 3) return 70;
  if (daysSinceAccess < 7) return 50;
  if (daysSinceAccess < 14) return 30;
  return 10;
}

function determineStatus(grade: number, engagement: number): 'CRITICAL' | 'WARNING' | 'GOOD' {
  if (grade < 50 || engagement < 30) return 'CRITICAL';
  if (grade < 70 || engagement < 50) return 'WARNING';
  return 'GOOD';
}

function formatGrade(grade: number): string {
  if (grade >= 90) return 'A';
  if (grade >= 80) return 'B';
  if (grade >= 70) return 'C';
  if (grade >= 60) return 'D';
  return 'F';
}

function formatLastAccess(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  const days = Math.floor(diff / (60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
