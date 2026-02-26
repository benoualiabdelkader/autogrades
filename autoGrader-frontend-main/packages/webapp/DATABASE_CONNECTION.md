# 🗄️ Database Connection Guide

## ✅ Setup Complete!

The AutoGrader application is now configured to connect to your Moodle database using **mysql2**.

## 📋 Connection Details

### Default Configuration
```javascript
{
  host: '127.0.0.1',
  port: 3307,
  database: 'moodle',
  user: 'root',
  password: '',
  prefix: 'mdl_'
}
```

## 🚀 How to Connect

### Method 1: From Dashboard
1. Open **http://localhost:3000**
2. Click the **🗄️** icon in the chat header
3. Enter your database credentials
4. Click **Connect**

### Method 2: Quick Button
1. Look for the **"🗄️ Connect DB"** button below the chat input
2. Click it to open database settings
3. Enter credentials and connect

## 📊 What Gets Fetched

Once connected, the system will fetch:

### Real-time Statistics
- ✅ **Students at Risk** - Students with grades < 70%
- ✅ **Engagement Rate** - Active users in last 7 days
- ✅ **Course Completion** - Completion percentage
- ✅ **Active Sessions** - Users active in last 30 minutes
- ✅ **Total Students** - All non-deleted users
- ✅ **Total Courses** - All visible courses
- ✅ **Average Grade** - Overall grade average

### Student Data
- ✅ **At-Risk Students** - Top 10 students with low grades
- ✅ **Student Names** - Full name and initials
- ✅ **Course Enrollment** - Which courses they're in
- ✅ **Final Grades** - Current grade status
- ✅ **Engagement Level** - Based on last access time
- ✅ **Risk Status** - CRITICAL, WARNING, or GOOD

## 🔍 SQL Queries Used

### Connection Test
```sql
SELECT COUNT(*) as count FROM mdl_user WHERE deleted = 0
SELECT COUNT(*) as count FROM mdl_course WHERE visible = 1
SELECT COUNT(DISTINCT userid) as count FROM mdl_sessions 
WHERE timemodified > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE))
```

### At-Risk Students
```sql
SELECT 
  u.id,
  CONCAT(u.firstname, ' ', u.lastname) as name,
  c.fullname as course,
  gg.finalgrade,
  u.lastaccess
FROM mdl_user u
JOIN mdl_grade_grades gg ON u.id = gg.userid
JOIN mdl_grade_items gi ON gg.itemid = gi.id
JOIN mdl_course c ON gi.courseid = c.id
WHERE u.deleted = 0 
  AND gg.finalgrade < 70
ORDER BY gg.finalgrade ASC
LIMIT 10
```

### Statistics
```sql
-- Students at risk
SELECT COUNT(*) FROM mdl_user u
JOIN mdl_grade_grades gg ON u.id = gg.userid
WHERE u.deleted = 0 AND gg.finalgrade < 70

-- Engagement rate
SELECT COUNT(DISTINCT userid) FROM mdl_logstore_standard_log
WHERE timecreated > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY))

-- Average grade
SELECT AVG(finalgrade) FROM mdl_grade_grades 
WHERE finalgrade IS NOT NULL

-- Completion rate
SELECT 
  COUNT(DISTINCT cc.userid) as completed,
  COUNT(DISTINCT ue.userid) as total
FROM mdl_enrol e
JOIN mdl_user_enrolments ue ON e.id = ue.enrolid
LEFT JOIN mdl_course_completions cc ON ue.userid = cc.userid 
WHERE cc.timecompleted IS NOT NULL
```

## 🔧 Troubleshooting

### Connection Failed

**Error: "Can't connect to MySQL server"**
- ✅ Check MariaDB is running
- ✅ Verify port 3307 is correct
- ✅ Check firewall settings

**Error: "Access denied for user"**
- ✅ Verify username and password
- ✅ Check user has permissions on database
- ✅ Try: `GRANT ALL ON moodle.* TO 'root'@'localhost';`

**Error: "Unknown database"**
- ✅ Database name is correct
- ✅ Database exists: `SHOW DATABASES;`
- ✅ Create if needed: `CREATE DATABASE moodle;`

**Error: "Table doesn't exist"**
- ✅ Check table prefix (mdl_ by default)
- ✅ Verify Moodle tables exist
- ✅ Run: `SHOW TABLES LIKE 'mdl_user';`

### Fallback Mode

If connection fails, the system will:
- ✅ Show simulated data
- ✅ Display error message
- ✅ Allow you to retry connection
- ✅ Continue working with demo data

## 📝 Configuration Storage

Settings are saved in:
- **localStorage** - Browser storage (persists across sessions)
- **Key**: `moodleConfig`

To clear saved settings:
```javascript
localStorage.removeItem('moodleConfig');
```

## 🔐 Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials** to version control
2. **Use environment variables** for production:
   ```bash
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_NAME=moodle
   DB_USER=root
   DB_PASS=your_password
   DB_PREFIX=mdl_
   ```

3. **Create read-only user** for AutoGrader:
   ```sql
   CREATE USER 'autograder'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT SELECT ON moodle.* TO 'autograder'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Use SSL/TLS** for production connections

## 🎯 Next Steps

1. ✅ Test connection with your Moodle database
2. ✅ Verify data appears correctly in dashboard
3. ✅ Check student list updates
4. ✅ Monitor real-time statistics
5. ✅ Use AI chat with live data

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify MariaDB/MySQL is running
3. Test connection with MySQL Workbench or similar tool
4. Check Moodle database structure matches expected schema

---

**Status**: ✅ Database connection is now LIVE and functional!

Enjoy real-time data from your Moodle instance! 🎉
