# 🚀 Quick Start Guide

## Installation

```bash
cd autoGrader-frontend-main/packages/webapp
npm install
npm run dev
```

## Access the Application

Open your browser: **http://localhost:3000**

## 📍 Main URLs

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` or `/dashboard` | Main analytics dashboard with AI chat |
| Database Settings | `/database-settings` | Configure Moodle database connection |
| Assignments | `/assignment-generator/home` | Create assignments |
| Rubrics | `/rubric-generator/home` | Generate rubrics |
| Smart Grader | `/smart-grader` | Auto-grade submissions |
| AI Assistant | `/ai-assistant` | General AI help |

## 🎯 Key Features

### 1. Dashboard (New)
- **75% Analytics** - Real-time student data, charts, statistics
- **25% AI Chat** - Integrated chatbot with workflow support
- Type **"task"** in chat to open Task Manager

### 2. Task Manager
- Create custom AI workflows
- Activate workflows for specific tasks
- Built-in workflows: Grade, Rubric, Analytics, Feedback

### 3. Database Connection
1. Go to `/database-settings`
2. Enter Moodle database credentials:
   - Host: `127.0.0.1`
   - Port: `3307`
   - Database: `moodle`
   - User: `root`
   - Prefix: `mdl_`
3. Click "Test Connection"

## 🎨 Design

- **Theme:** Dark with neon green accents
- **Font:** Space Grotesk
- **Style:** Glassmorphism with neon glow effects

## 🔧 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000
npm run dev
```

### Module not found
```bash
npm install
```

### Database connection fails
- Check MariaDB is running on port 3307
- Verify credentials in database settings
- For production, install: `npm install mysql2`

## 📝 Development Notes

- Hot reload enabled (Fast Refresh)
- TypeScript support
- Tailwind CSS for styling
- Next.js 14 App Router + Pages Router (hybrid)

## 🎯 Next Steps

1. ✅ Configure database connection
2. ✅ Explore the dashboard
3. ✅ Try the AI chat
4. ✅ Create custom workflows
5. ✅ Test with real Moodle data

Enjoy! 🎉
