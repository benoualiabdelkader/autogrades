# AutoGrader Project Structure

## 🎯 Main Pages

### 1. Dashboard (New Design)
**URL:** `/dashboard` or `/`
- **Design:** 75% Analytics Dashboard + 25% AI Chat
- **Features:**
  - Real-time statistics (Students at Risk, Engagement, Completion, Active Sessions)
  - Grade progression charts
  - Weekly activity heatmap
  - High-risk student watchlist
  - Integrated AI chatbot
  - Task/Workflow manager (type "task" in chat)
- **No Sidebar** - Full screen layout

### 2. Database Settings
**URL:** `/database-settings`
- **Purpose:** Configure Moodle database connection
- **Features:**
  - Test database connection
  - Save configuration
  - Two options: Same DB with different prefix OR New database
- **With Sidebar**

### 3. Legacy Pages (With Sidebar)
- `/assignment-generator/home` - Assignment Generator
- `/rubric-generator/home` - Rubric Builder
- `/smart-grader` - Smart Grader
- `/ai-assistant` - AI Assistant
- `/json-tool` - JSON Processor
- `/json-analyzer` - JSON Analyzer

## 🎨 Design System

### Colors
- **Primary:** `#00ff88` (Neon Green)
- **Background:** `#0b0f0b` (Dark)
- **Card:** `#161b16` (Dark Green Tint)
- **Border:** `rgba(0, 255, 136, 0.15)` (Neon Green Transparent)

### Typography
- **Font:** Space Grotesk

### Components
- **Glass Panel:** Glassmorphism effect with backdrop blur
- **Neon Glow:** Box shadow with primary color
- **Pulse Animation:** For live indicators

## 🗄️ Database Configuration

### Moodle Connection
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

### AutoGrader Options

**Option 1: Same Database**
```javascript
{
  dbname: 'moodle',
  prefix: 'ag_'  // Different prefix
}
```

**Option 2: New Database**
```javascript
{
  dbname: 'autograder_db',
  prefix: 'ag_'
}
```

## 🤖 AI Workflows

### Built-in Workflows
1. **📝 Grade Assignments** - Analyze and grade student work
2. **📋 Generate Rubric** - Create grading criteria
3. **📊 Student Analytics** - Performance analysis
4. **💬 Generate Feedback** - Personalized feedback

### Custom Workflows
- Create new workflows in Task Manager
- Define custom AI prompts
- Activate/deactivate workflows
- Edit existing workflows

## 🚀 Running the Project

```bash
cd autoGrader-frontend-main/packages/webapp
npm install
npm run dev
```

Open: **http://localhost:3000**

## 📁 File Structure

```
src/
├── app/
│   ├── page.tsx              # Redirect to dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── pages/
│   ├── dashboard/
│   │   └── index.tsx         # New dashboard (75/25 layout)
│   ├── database-settings/
│   │   └── index.tsx         # DB configuration
│   ├── api/
│   │   └── moodle/
│   │       ├── connect.ts    # Test DB connection
│   │       ├── students.ts   # Fetch students
│   │       └── stats.ts      # Fetch statistics
│   └── [other pages...]
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── ChatInterface.tsx     # Chat component
│   └── [other components...]
└── lib/
    ├── db/
    │   ├── config.ts         # DB configuration
    │   └── moodle-queries.ts # SQL queries
    └── [other libs...]
```

## 🎯 Key Features

### Dashboard
- ✅ Live data sync indicator
- ✅ Real-time statistics cards
- ✅ Interactive charts (SVG)
- ✅ Student watchlist table
- ✅ AI chatbot integration
- ✅ Workflow management

### Task Manager
- ✅ Create custom workflows
- ✅ Edit workflow prompts
- ✅ Activate/deactivate workflows
- ✅ Visual workflow cards
- ✅ Icon customization

### Database Integration
- ✅ Moodle database support
- ✅ MariaDB connection
- ✅ Test connection feature
- ✅ Configuration persistence
- ✅ Multiple database options

## 🔧 Configuration Files

- `tailwind.config.ts` - Tailwind CSS configuration
- `next.config.mjs` - Next.js configuration
- `package.json` - Dependencies
- `.env.local` - Environment variables (create if needed)

## 📝 Notes

- The new dashboard uses a different layout (no sidebar)
- Legacy pages maintain the original sidebar design
- All pages use the same design system (neon green theme)
- Database connection is simulated in development (add mysql2 for production)
