# 🚀 START HERE - AutoGrader Quick Guide

## ✅ Everything is Ready!

Your AutoGrader application is **fully configured and running**.

---

## 🌐 Access the Application

### Main Dashboard
**URL**: http://localhost:3000

The homepage automatically redirects to the dashboard.

### Direct Links
- **Dashboard**: http://localhost:3000/dashboard
- **Database Settings**: http://localhost:3000/database-settings
- **AI Assistant**: http://localhost:3000/ai-assistant
- **Assignment Generator**: http://localhost:3000/assignment-generator/home
- **Rubric Generator**: http://localhost:3000/rubric-generator/home
- **Smart Grader**: http://localhost:3000/smart-grader

---

## 🗄️ Connect to Database (First Time)

### Step 1: Open Dashboard
Go to: http://localhost:3000

### Step 2: Click Database Icon
Look for the **🗄️** icon in the chat header (top right panel)

### Step 3: Enter Credentials
```
Host: 127.0.0.1
Port: 3307
Database: moodle
Username: root
Password: (leave empty if no password)
Prefix: mdl_
```

### Step 4: Connect
Click the **"Connect"** button

### Step 5: Enjoy!
- Data loads automatically
- Auto-refreshes every 30 seconds
- Real-time statistics displayed

---

## 🎯 Key Features

### 📊 Dashboard (75% Left Panel)
- **Live Statistics Cards**
  - Students at Risk
  - Engagement Rate
  - Course Completion
  - Active Sessions

- **Interactive Charts**
  - Grade Progression Trends
  - Weekly Activity Heatmap

- **Student Watchlist Table**
  - Top 10 at-risk students
  - Real-time data from Moodle

### 🤖 AI Chat (25% Right Panel)
- **Integrated Chatbot**
  - Ask questions
  - Get AI assistance
  - Context-aware responses

- **Database Settings** (🗄️ icon)
  - Connect to Moodle
  - Test connection
  - Save credentials

- **AI Settings** (⚙️ icon)
  - Choose AI model
  - Select analysis mode

- **Quick Actions**
  - Connect DB
  - Manage Tasks
  - Predict Finals
  - Summarize Risks

### ⚙️ Task Manager
Type **"task"** in chat or click **"⚙️ Manage Tasks"**

**Built-in Workflows**:
1. 📝 Grade Assignments
2. 📋 Generate Rubric
3. 📊 Student Analytics
4. 💬 Generate Feedback

**Create Custom Workflows**:
- Add your own AI workflows
- Define custom prompts
- Activate/deactivate as needed

---

## 🔄 Auto-Refresh

Once connected to database:
- ✅ Data refreshes every **30 seconds**
- ✅ Manual refresh button available
- ✅ Connection persists across page reloads
- ✅ Auto-connects on next visit

---

## 🎨 UI Features

### Design
- **Dark Theme** with neon green (#00ff88)
- **Glassmorphism** effects
- **Smooth Animations**
- **Responsive Layout**

### Status Indicators
- 🟢 **Live Data Sync** - Connected to database
- 🟡 **Demo Mode** - Not connected (showing demo data)
- 🔵 **Updating...** - Fetching new data
- 🗄️ **DB Connected** - Badge in chat header

---

## 🛠️ Troubleshooting

### Can't Connect to Database?

**Check MariaDB is Running**:
```bash
# Windows
services.msc
# Look for MariaDB/MySQL service

# Or check port
netstat -an | findstr 3307
```

**Verify Credentials**:
- Host: 127.0.0.1 (localhost)
- Port: 3307 (default MariaDB)
- Database: moodle (your Moodle DB name)
- User: root (or your DB user)
- Password: (your DB password)

**Test Connection Manually**:
```bash
mysql -h 127.0.0.1 -P 3307 -u root -p moodle
```

### Page Shows 404?

**Clear Cache and Restart**:
```bash
# Stop server (Ctrl+C in terminal)
# Delete .next folder
Remove-Item -Recurse -Force .next

# Restart
npm run dev
```

### Data Not Updating?

1. Check database connection (🗄️ icon)
2. Click "🔄 Refresh Data" button
3. Check browser console for errors
4. Verify Moodle tables exist

---

## 📱 Quick Actions Guide

### In Chat Panel

**🗄️ Database Icon**
- Opens database settings
- Connect/disconnect
- View connection status

**⚙️ Settings Icon**
- Choose AI model
- Select analysis mode
- Configure AI behavior

**Quick Buttons**:
- **🗄️ Connect DB** - Quick database connection
- **⚙️ Manage Tasks** - Open workflow manager
- **Predict Finals** - AI prediction
- **Summarize Risks** - Risk analysis
- **Resource Usage** - Usage statistics

### In Dashboard

**🔄 Refresh Data**
- Manual data refresh
- Updates all statistics
- Fetches latest students

**Export Report**
- Download dashboard data
- Generate PDF report
- Export to CSV

---

## 🎓 Usage Examples

### Example 1: Monitor At-Risk Students
1. Connect to database
2. View "Students at Risk" card
3. Check student watchlist table
4. Click student for details

### Example 2: Use AI for Grading
1. Type "task" in chat
2. Activate "Grade Assignments" workflow
3. Ask AI to grade specific work
4. Get detailed feedback

### Example 3: Generate Rubric
1. Open Task Manager
2. Activate "Generate Rubric" workflow
3. Describe assignment requirements
4. AI generates rubric criteria

### Example 4: Analyze Engagement
1. Check "Engagement Rate" card
2. View "Weekly Activity Heatmap"
3. Identify low-engagement periods
4. Ask AI for recommendations

---

## 📊 Understanding the Data

### Students at Risk
- Students with grades < 70%
- Sorted by lowest grade first
- Updated in real-time

### Engagement Rate
- % of students active in last 7 days
- Based on Moodle log entries
- Higher = better engagement

### Course Completion
- % of enrolled students who completed
- Calculated from course_completions table
- Target: > 60%

### Active Sessions
- Users logged in last 30 minutes
- Real-time count
- Shows current platform usage

---

## 🔐 Security Notes

### Credentials Storage
- Saved in browser localStorage
- Not sent to external servers
- Cleared when you clear browser data

### Database Access
- Read-only queries (SELECT)
- No data modification
- Secure connection via mysql2

### Best Practices
1. Use read-only database user
2. Don't share credentials
3. Use strong passwords
4. Enable SSL for production

---

## 📚 Additional Resources

### Documentation Files
- `README_FINAL.md` - Complete documentation
- `DATABASE_CONNECTION.md` - Database setup guide
- `DASHBOARD_UPDATES.md` - Dashboard features
- `QUICK_START.md` - Quick start guide
- `PROJECT_STRUCTURE.md` - Project architecture

### Support
- Check browser console for errors
- Review API responses in Network tab
- Verify Moodle database structure
- Test queries in MySQL Workbench

---

## ✨ Tips & Tricks

### Keyboard Shortcuts
- Type **"task"** in chat → Opens Task Manager
- **Enter** in chat → Send message
- **Shift+Enter** → New line in chat

### Performance
- Dashboard auto-refreshes every 30s
- Manual refresh available anytime
- Connection persists across reloads
- Demo mode if database unavailable

### Customization
- Create custom AI workflows
- Modify refresh interval in code
- Add more statistics cards
- Customize SQL queries

---

## 🎉 You're All Set!

Your AutoGrader platform is ready to use!

**Next Steps**:
1. ✅ Open http://localhost:3000
2. ✅ Connect to your Moodle database
3. ✅ Explore the dashboard
4. ✅ Try the AI chatbot
5. ✅ Create custom workflows

**Enjoy your AI-powered education platform!** 🚀

---

**Need Help?**
- Check documentation files
- Review troubleshooting section
- Inspect browser console
- Test database connection

**Version**: 2.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2026-02-19
