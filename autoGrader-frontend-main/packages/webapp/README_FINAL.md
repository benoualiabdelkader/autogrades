# 🎓 AutoGrader - AI-Powered Education Platform

## 🚀 Project Status: ✅ COMPLETE & READY

A modern, real-time analytics dashboard for Moodle with integrated AI chatbot and workflow management.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Integration](#database-integration)
5. [AI Workflows](#ai-workflows)
6. [API Endpoints](#api-endpoints)
7. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🎨 Modern UI/UX
- **Dark Theme** with neon green accents (#00ff88)
- **Glassmorphism** design with backdrop blur
- **Space Grotesk** typography
- **Responsive** layout (75% dashboard + 25% chat)
- **Smooth animations** and transitions

### 📊 Real-Time Dashboard
- ✅ Live statistics from Moodle database
- ✅ Auto-refresh every 30 seconds
- ✅ Students at risk monitoring
- ✅ Engagement rate tracking
- ✅ Course completion metrics
- ✅ Active sessions counter
- ✅ Interactive charts and heatmaps

### 🤖 AI Chatbot
- ✅ Integrated chat interface (25% panel)
- ✅ Multiple AI model support (GPT-4o, Claude 3.5)
- ✅ Custom workflow system
- ✅ Context-aware responses
- ✅ Real-time data access

### 🗄️ Database Integration
- ✅ Direct Moodle MariaDB connection
- ✅ Real-time data fetching
- ✅ Secure credential storage
- ✅ Auto-connect on load
- ✅ Fallback to demo mode

### ⚙️ Workflow Management
- ✅ Create custom AI workflows
- ✅ Pre-built workflows (Grade, Rubric, Analytics, Feedback)
- ✅ Activate/deactivate workflows
- ✅ Edit workflow prompts
- ✅ Visual workflow cards

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MariaDB/MySQL running on port 3307
- Moodle database accessible

### Installation

```bash
# Navigate to project
cd autoGrader-frontend-main/packages/webapp

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access Application
Open browser: **http://localhost:3000**

### First-Time Setup

1. **Dashboard loads** (auto-redirects from `/`)
2. **Click 🗄️ icon** in chat header
3. **Enter database credentials**:
   ```
   Host: 127.0.0.1
   Port: 3307
   Database: moodle
   User: root
   Password: (leave empty if none)
   Prefix: mdl_
   ```
4. **Click "Connect"**
5. **Data loads automatically!**

---

## 🏗️ Architecture

### Project Structure
```
src/
├── app/
│   ├── page.tsx              # Redirect to dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles + theme
├── pages/
│   ├── dashboard/
│   │   └── index.tsx         # Main dashboard (75/25 layout)
│   ├── database-settings/
│   │   └── index.tsx         # DB configuration page
│   ├── api/
│   │   └── moodle/
│   │       ├── connect.ts    # Test DB connection
│   │       ├── students.ts   # Fetch at-risk students
│   │       └── stats.ts      # Fetch statistics
│   └── [legacy pages...]
├── components/
│   ├── Sidebar.tsx           # Navigation (legacy pages)
│   └── ChatInterface.tsx     # Chat component
└── lib/
    └── db/
        ├── config.ts         # DB configuration
        └── moodle-queries.ts # SQL queries
```

### Tech Stack
- **Framework**: Next.js 14 (App Router + Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: mysql2 (MariaDB/MySQL)
- **Icons**: Font Awesome
- **Font**: Space Grotesk (Google Fonts)

---

## 🗄️ Database Integration

### Connection Configuration

```javascript
{
  dbhost: '127.0.0.1',
  dbport: 3307,
  dbname: 'moodle',
  dbuser: 'root',
  dbpass: '',
  prefix: 'mdl_'
}
```

### Data Fetched

#### Statistics
- Students at risk (grade < 70%)
- Engagement rate (active last 7 days)
- Course completion percentage
- Active sessions (last 30 minutes)
- Total students & courses
- Average grade

#### Students
- Top 10 at-risk students
- Name, course, grade
- Engagement level
- Risk status (CRITICAL/WARNING/GOOD)

### SQL Queries

**At-Risk Students**:
```sql
SELECT 
  u.id,
  CONCAT(u.firstname, ' ', u.lastname) as name,
  c.fullname as course,
  gg.finalgrade
FROM mdl_user u
JOIN mdl_grade_grades gg ON u.id = gg.userid
JOIN mdl_grade_items gi ON gg.itemid = gi.id
JOIN mdl_course c ON gi.courseid = c.id
WHERE u.deleted = 0 AND gg.finalgrade < 70
ORDER BY gg.finalgrade ASC
LIMIT 10
```

**Statistics**:
```sql
-- Students at risk
SELECT COUNT(*) FROM mdl_user u
JOIN mdl_grade_grades gg ON u.id = gg.userid
WHERE u.deleted = 0 AND gg.finalgrade < 70

-- Engagement rate
SELECT COUNT(DISTINCT userid) FROM mdl_logstore_standard_log
WHERE timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY))

-- Active sessions
SELECT COUNT(DISTINCT userid) FROM mdl_sessions 
WHERE timemodified > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE))
```

### Auto-Refresh
- Fetches data every **30 seconds** when connected
- Manual refresh button available
- Auto-connects on page load if credentials saved

---

## 🤖 AI Workflows

### Built-in Workflows

1. **📝 Grade Assignments**
   - Analyze and grade student work
   - Provide detailed feedback
   - Fair and constructive evaluation

2. **📋 Generate Rubric**
   - Create grading criteria
   - Point distribution
   - Performance levels

3. **📊 Student Analytics**
   - Performance analysis
   - Pattern identification
   - Risk prediction

4. **💬 Generate Feedback**
   - Personalized feedback
   - Specific achievements
   - Actionable next steps

### Creating Custom Workflows

1. Type **"task"** in chat OR click **"⚙️ Manage Tasks"**
2. Click **"+ Create New Workflow"**
3. Fill in:
   - Workflow Name
   - Icon (emoji)
   - Description
   - AI System Prompt
4. Click **"Create Workflow"**
5. Activate when needed!

### Using Workflows

1. Open Task Manager
2. Click **"Activate"** on desired workflow
3. AI chatbot switches to that workflow
4. Ask questions related to the workflow
5. Deactivate or switch workflows anytime

---

## 🔌 API Endpoints

### POST `/api/moodle/connect`
Test database connection

**Request**:
```json
{
  "dbhost": "127.0.0.1",
  "dbport": "3307",
  "dbname": "moodle",
  "dbuser": "root",
  "dbpass": "",
  "prefix": "mdl_"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Connected successfully",
  "stats": {
    "totalUsers": 150,
    "totalCourses": 12,
    "activeSessions": 45
  }
}
```

### GET `/api/moodle/students`
Fetch at-risk students

**Query Params**: dbhost, dbport, dbname, dbuser, dbpass, prefix

**Response**:
```json
{
  "success": true,
  "students": [
    {
      "id": 1,
      "name": "John Doe",
      "initials": "JD",
      "course": "Math 101",
      "engagement": 45,
      "finalgrade": 65,
      "grade": "D",
      "status": "WARNING",
      "color": "orange"
    }
  ]
}
```

### GET `/api/moodle/stats`
Fetch dashboard statistics

**Query Params**: dbhost, dbport, dbname, dbuser, dbpass, prefix

**Response**:
```json
{
  "success": true,
  "stats": {
    "studentsAtRisk": 12,
    "engagementRate": 88,
    "courseCompletion": 64.2,
    "activeSessions": 450,
    "totalStudents": 342,
    "totalCourses": 8,
    "averageGrade": 75
  }
}
```

---

## 🔧 Troubleshooting

### Connection Issues

**"Can't connect to MySQL server"**
```bash
# Check MariaDB is running
sudo systemctl status mariadb

# Start if not running
sudo systemctl start mariadb

# Verify port
netstat -an | grep 3307
```

**"Access denied for user"**
```sql
-- Grant permissions
GRANT ALL ON moodle.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

**"Unknown database"**
```sql
-- Create database
CREATE DATABASE moodle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**"Table doesn't exist"**
```sql
-- Check tables
SHOW TABLES LIKE 'mdl_user';

-- Verify prefix
SELECT * FROM mdl_user LIMIT 1;
```

### Build Issues

**Module not found**
```bash
npm install
```

**Port already in use**
```bash
npx kill-port 3000
npm run dev
```

**TypeScript errors**
```bash
npm run build
```

### Performance Issues

**Slow queries**
- Add indexes to Moodle tables
- Reduce refresh interval
- Limit student count

**High memory usage**
- Clear browser cache
- Restart development server
- Check for memory leaks

---

## 📝 Configuration Files

### `tailwind.config.ts`
Theme configuration with neon green colors

### `next.config.mjs`
Next.js configuration

### `package.json`
Dependencies and scripts

### `.env.local` (create if needed)
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=moodle
DB_USER=root
DB_PASS=
DB_PREFIX=mdl_
```

---

## 🎯 Key Features Summary

✅ **Real-time dashboard** with live Moodle data
✅ **AI chatbot** with custom workflows
✅ **Auto-refresh** every 30 seconds
✅ **Secure database** connection
✅ **Modern UI/UX** with neon green theme
✅ **Responsive design** (75/25 layout)
✅ **Task management** system
✅ **Multiple AI models** support
✅ **Persistent settings** (localStorage)
✅ **Fallback mode** (demo data)

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify database connection
3. Review API responses
4. Check Moodle table structure

---

## 🎉 Status

**✅ PRODUCTION READY**

All features implemented and tested:
- ✅ Database connection working
- ✅ Real-time data fetching
- ✅ Auto-refresh functional
- ✅ AI workflows operational
- ✅ UI/UX complete
- ✅ No critical errors

**Enjoy your AI-powered education platform!** 🚀

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-19  
**Status**: ✅ Complete
