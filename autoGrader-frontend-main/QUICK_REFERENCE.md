# 🚀 Quick Reference - Real Workflow System

## System Architecture

```
User Click "Execute" Button
        ↓
WorkflowRegistry.getWorkflow(taskId)
        ↓
Load Pre-built n8n JSON
        ↓
RealWorkflowExecutor.executeWorkflow()
        ↓
Execute Nodes: DB → AI → Transform → Export
        ↓
Download File (CSV/PDF)
```

## Available Workflows

| ID | Name | Icon | Output | Keywords |
|----|------|------|--------|----------|
| 1 | Grade Assignments | 📝 | CSV | grade, grading, assignments |
| 2 | Generate Rubric | 📋 | PDF | rubric, criteria, standards |
| 3 | Student Analytics | 📊 | PDF | analytics, analysis, at-risk |
| 4 | Generate Feedback | 💬 | CSV | feedback, comments |

## Configuration

```typescript
// Database (All Workflows)
{
  host: '127.0.0.1',
  port: 3307,
  database: 'moodle',
  user: 'root',
  password: '',
  prefix: 'mdl_'
}

// AI Provider (All Workflows)
{
  provider: 'Groq API',
  model: 'Llama 3.3 70B',
  language: 'English/French only'
}

// Performance (Lightweight)
{
  maxConcurrent: 3,
  delayBetweenRequests: 2,
  maxItems: 20,
  memoryLimit: '<100MB'
}
```

## Key Files

```
src/lib/n8n/workflows/
├── grade-assignments.json      # Task 1
├── generate-rubric.json        # Task 2
├── student-analytics.json      # Task 3
└── generate-feedback.json      # Task 4

src/lib/n8n/
├── WorkflowRegistry.ts         # Loads JSON files
└── RealWorkflowExecutor.ts     # Executes workflows

src/components/
└── RealWorkflowModal.tsx       # User interface

src/pages/dashboard/
└── index.tsx                   # Main dashboard
```

## Usage

### Via Dashboard
```
1. Click "Manage Tasks"
2. Click "Execute" on any workflow
3. Click "Execute Workflow (User Requested)"
4. Wait for completion
5. Download file
```

### Via Chat
```
1. Type keyword (e.g., "grade")
2. Modal opens automatically
3. Click "Execute Workflow (User Requested)"
4. Wait for completion
5. Download file
```

## Important Rules

### ✅ DO
- Workflows load on startup (NO execution)
- Workflows execute ONLY when user clicks Execute
- All workflows use same Moodle DB
- All workflows use Groq API
- System is lightweight (<100MB)
- AI responds in English/French only

### ❌ DON'T
- NO automatic execution
- NO dynamic workflow generation
- NO Arabic in AI responses
- NO heavy resource usage

## Verification

```bash
# Check files exist
ls src/lib/n8n/workflows/

# Expected output:
# grade-assignments.json
# generate-rubric.json
# student-analytics.json
# generate-feedback.json

# Start application
npm run dev

# Check console for:
# ✅ Workflow Registry loaded: 4 pre-built workflows ready
# ⚠️ Workflows will ONLY execute when user explicitly requests
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflows execute on startup | Check useEffect only loads registry |
| "No workflow found" error | Verify JSON files exist |
| Execute button disabled | Check task is active & DB connected |
| High memory usage | Verify maxConcurrent=3, delay=2s |
| Import errors | Check imports from @/lib/n8n/ |

## Performance Benchmarks

| Metric | Expected |
|--------|----------|
| Startup | <1 second |
| Registry load | <100ms |
| Modal open | <50ms |
| Workflow execution | 10-60 seconds |
| Memory usage | 50-100MB |
| File export | <1 second |

## Code Snippets

### Initialize Registry
```typescript
useEffect(() => {
  const registry = WorkflowRegistry.getInstance();
  console.log(`✅ ${registry.getWorkflowCount()} workflows ready`);
}, []);
```

### Check Workflow Exists
```typescript
const registry = WorkflowRegistry.getInstance();
const hasWorkflow = registry.hasWorkflow(taskId);
```

### Execute Workflow
```typescript
const executor = RealWorkflowExecutor.getInstance();
const result = await executor.executeWorkflow(taskId, {
  maxConcurrent: 3,
  delayBetweenRequests: 2,
  maxItems: 20
});
```

### Get Workflow Metadata
```typescript
const registry = WorkflowRegistry.getInstance();
const workflow = registry.getWorkflow(taskId);
// Returns: { id, name, description, icon, outputFormat, workflow }
```

## Status Indicators

| Indicator | Meaning |
|-----------|---------|
| "n8n JSON" badge | Task has real workflow |
| "No Workflow" button | Task needs workflow JSON |
| Green "ON" badge | Task is active |
| Gray "OFF" badge | Task is inactive |
| ⚠️ Demo Mode | Database not connected |
| ✓ Live Data Sync | Database connected |

## Documentation

- **REAL_WORKFLOW_SYSTEM_COMPLETE.md** - Full system documentation
- **INTEGRATION_CHANGES.md** - Changes summary
- **VERIFY_INTEGRATION.md** - Verification guide
- **PROJECT_STATUS_FINAL_AR.md** - Status in Arabic
- **QUICK_REFERENCE.md** - This file

---

**Version**: 2.5.0
**Status**: ✅ Production Ready
**Last Updated**: Context Transfer Session
