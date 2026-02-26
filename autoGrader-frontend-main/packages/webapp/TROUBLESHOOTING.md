# 🔧 Troubleshooting Guide

## Common Dashboard Issues

### Issue 1: Page Shows Blank or White Screen

**Possible Causes:**
- JavaScript error in browser
- CSS not loading
- React component error

**Solutions:**
1. **Open Browser Console** (F12)
2. **Check for errors** in Console tab
3. **Clear browser cache**: Ctrl+Shift+Delete
4. **Hard refresh**: Ctrl+Shift+R
5. **Try incognito mode**

### Issue 2: Data Not Showing

**Symptoms:**
- Cards show "..." or empty
- Student table is empty
- No statistics displayed

**Solutions:**

**A. Check Database Connection**
```
1. Click 🗄️ icon in chat header
2. Verify credentials are correct
3. Click "Connect" button
4. Look for success message
```

**B. Check Browser Console**
```javascript
// Open Console (F12) and look for:
- Network errors (red in Network tab)
- API errors (check /api/moodle/*)
- CORS errors
- Connection refused errors
```

**C. Verify Database is Running**
```bash
# Windows - Check if MariaDB is running
services.msc
# Look for MariaDB or MySQL service

# Or check port
netstat -an | findstr 3307
```

### Issue 3: "Demo Mode" Badge Showing

**Meaning:**
- Not connected to database
- Showing simulated data

**Solution:**
1. Click 🗄️ icon
2. Enter database credentials
3. Click "Connect"
4. Badge should change to "Live Data Sync"

### Issue 4: Connection Fails

**Error Messages:**

**"Can't connect to MySQL server"**
```
Solution:
1. Start MariaDB service
2. Check port 3307 is correct
3. Verify firewall allows connection
```

**"Access denied for user"**
```
Solution:
1. Check username and password
2. Grant permissions:
   mysql> GRANT ALL ON moodle.* TO 'root'@'localhost';
   mysql> FLUSH PRIVILEGES;
```

**"Unknown database 'moodle'"**
```
Solution:
1. Create database:
   mysql> CREATE DATABASE moodle;
2. Or use correct database name
```

**"Table 'mdl_user' doesn't exist"**
```
Solution:
1. Check table prefix (mdl_ by default)
2. Verify Moodle is installed
3. Check tables exist:
   mysql> SHOW TABLES LIKE 'mdl_%';
```

### Issue 5: Auto-Refresh Not Working

**Symptoms:**
- Data doesn't update automatically
- Manual refresh works but auto doesn't

**Solutions:**
1. **Check connection status** - Must show "Live Data Sync"
2. **Wait 30 seconds** - Auto-refresh interval
3. **Check browser console** for errors
4. **Reload page** - Ctrl+R

### Issue 6: Slow Performance

**Symptoms:**
- Dashboard loads slowly
- Data takes long to update
- Browser feels sluggish

**Solutions:**

**A. Optimize Database**
```sql
-- Add indexes to improve query speed
ALTER TABLE mdl_user ADD INDEX idx_deleted (deleted);
ALTER TABLE mdl_grade_grades ADD INDEX idx_userid (userid);
ALTER TABLE mdl_sessions ADD INDEX idx_timemodified (timemodified);
```

**B. Reduce Refresh Frequency**
```javascript
// In dashboard/index.tsx, change:
const interval = setInterval(fetchDashboardData, 60000); // 60 seconds instead of 30
```

**C. Limit Student Count**
```javascript
// In /api/moodle/students.ts, change:
LIMIT 5  // Instead of LIMIT 10
```

### Issue 7: Charts Not Displaying

**Symptoms:**
- Empty chart areas
- SVG not rendering
- Heatmap missing

**Solutions:**
1. **Check browser compatibility** - Use Chrome/Edge/Firefox
2. **Disable browser extensions** - Try incognito mode
3. **Clear cache** - Ctrl+Shift+Delete
4. **Check console** for SVG errors

### Issue 8: Task Manager Not Opening

**Symptoms:**
- Typing "task" doesn't work
- "Manage Tasks" button doesn't respond

**Solutions:**
1. **Check exact spelling** - Must be lowercase "task"
2. **Clear input field** - Delete any extra spaces
3. **Reload page** - Ctrl+R
4. **Check console** for JavaScript errors

### Issue 9: AI Chat Not Responding

**Symptoms:**
- Messages don't send
- No AI responses
- Chat input disabled

**Solutions:**
1. **Check API keys** - Verify OpenAI/Groq keys in .env.local
2. **Check network** - Look for API errors in console
3. **Verify AI model** - Check settings (⚙️ icon)
4. **Reload page**

### Issue 10: Styles Look Broken

**Symptoms:**
- No colors
- Layout broken
- Missing glassmorphism effects

**Solutions:**
1. **Check Tailwind CSS** is loading
2. **Clear .next folder**:
   ```bash
   Remove-Item -Recurse -Force .next
   npm run dev
   ```
3. **Verify globals.css** is imported
4. **Hard refresh** browser: Ctrl+Shift+R

---

## Debug Checklist

When something goes wrong, check these in order:

### 1. Browser Console (F12)
```
✓ No red errors in Console tab
✓ No failed requests in Network tab
✓ No CORS errors
✓ API responses are 200 OK
```

### 2. Database Connection
```
✓ MariaDB/MySQL is running
✓ Port 3307 is accessible
✓ Credentials are correct
✓ Database 'moodle' exists
✓ Tables with prefix 'mdl_' exist
```

### 3. Server Status
```
✓ npm run dev is running
✓ No errors in terminal
✓ Port 3000 is accessible
✓ http://localhost:3000 loads
```

### 4. File System
```
✓ node_modules folder exists
✓ .next folder exists (or delete and rebuild)
✓ All source files present
✓ No file permission errors
```

---

## Quick Fixes

### Fix 1: Complete Reset
```bash
# Stop server (Ctrl+C)
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Fix 2: Clear All Cache
```bash
# Browser: Ctrl+Shift+Delete
# Select: All time, Cached images and files
# Clear localStorage:
localStorage.clear()  # In browser console
```

### Fix 3: Test Database Manually
```bash
# Connect to database
mysql -h 127.0.0.1 -P 3307 -u root -p moodle

# Test queries
SELECT COUNT(*) FROM mdl_user WHERE deleted = 0;
SELECT COUNT(*) FROM mdl_course WHERE visible = 1;
```

### Fix 4: Verify API Endpoints
```bash
# Test in browser or Postman:
POST http://localhost:3000/api/moodle/connect
Body: {
  "dbhost": "127.0.0.1",
  "dbport": "3307",
  "dbname": "moodle",
  "dbuser": "root",
  "dbpass": "",
  "prefix": "mdl_"
}
```

---

## Error Messages Explained

### "Cannot read properties of undefined"
**Cause:** Data not loaded yet  
**Fix:** Wait for data to load, check connection

### "Network Error"
**Cause:** API not reachable  
**Fix:** Check server is running, verify URL

### "CORS Error"
**Cause:** Cross-origin request blocked  
**Fix:** Not applicable for localhost, check proxy settings

### "Module not found"
**Cause:** Missing dependency  
**Fix:** Run `npm install`

### "Port 3000 already in use"
**Cause:** Another process using port  
**Fix:** `npx kill-port 3000` then restart

---

## Getting Help

### Information to Provide

When asking for help, include:

1. **Error message** (exact text)
2. **Browser console** screenshot
3. **Network tab** showing failed requests
4. **Steps to reproduce** the issue
5. **Environment**:
   - OS: Windows/Mac/Linux
   - Browser: Chrome/Firefox/Edge
   - Node version: `node --version`
   - Database: MariaDB/MySQL version

### Useful Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check if port is in use
netstat -an | findstr 3000

# Check MariaDB status
mysql --version

# Test database connection
mysql -h 127.0.0.1 -P 3307 -u root -p
```

---

## Prevention Tips

### Best Practices

1. **Always check console** before reporting issues
2. **Keep dependencies updated** regularly
3. **Clear cache** when things look broken
4. **Use correct credentials** for database
5. **Monitor server logs** for errors
6. **Test in incognito** to rule out extensions
7. **Backup database** before making changes
8. **Document custom changes** you make

### Regular Maintenance

```bash
# Weekly
npm update  # Update dependencies
npm audit fix  # Fix security issues

# Monthly
Remove-Item -Recurse -Force .next  # Clear build cache
npm install  # Reinstall dependencies

# As Needed
Clear browser cache
Restart MariaDB service
Reboot computer
```

---

## Still Having Issues?

If none of these solutions work:

1. **Check all documentation files**:
   - START_HERE.md
   - README_FINAL.md
   - DATABASE_CONNECTION.md

2. **Review code** for custom changes

3. **Test with demo data** (disconnect database)

4. **Try different browser**

5. **Check system resources** (RAM, CPU)

6. **Restart everything**:
   - Close browser
   - Stop server
   - Restart MariaDB
   - Restart computer

---

**Remember:** Most issues are related to:
- ❌ Database not running
- ❌ Wrong credentials
- ❌ Browser cache
- ❌ Missing dependencies

**Always check these first!** ✅
