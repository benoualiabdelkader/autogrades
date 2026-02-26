# 🔍 Integration Verification Guide

## Quick Verification Steps

### 1. Check Workflow Files Exist
```bash
# All 4 JSON files should exist
ls src/lib/n8n/workflows/
```

Expected output:
- ✅ grade-assignments.json
- ✅ generate-rubric.json
- ✅ student-analytics.json
- ✅ generate-feedback.json

### 2. Check System Files
```bash
# Core system files
ls src/lib/n8n/
ls src/components/RealWorkflowModal.tsx
```

Expected:
- ✅ WorkflowRegistry.ts
- ✅ RealWorkflowExecutor.ts
- ✅ RealWorkflowModal.tsx

### 3. Start Application
```bash
cd packages/webapp
npm run dev
```

### 4. Open Browser Console
Navigate to `http://localhost:3000/dashboard`

Check console for:
```
✅ Workflow Registry loaded: 4 pre-built workflows ready
⚠️ Workflows will ONLY execute when user explicitly requests
```

### 5. Test Workflow Loading (NO Execution)

**Expected Behavior:**
- Dashboard loads normally
- No workflows execute automatically
- Console shows registry initialized
- No database queries happen yet
- No AI API calls happen yet

**If you see automatic execution:** ❌ PROBLEM - workflows should NOT execute on startup

### 6. Test Manual Execution

**Steps:**
1. Click "Manage Tasks" button
2. Verify all 4 tasks show "n8n JSON" badge
3. Click "Execute" on any task
4. Modal opens showing workflow details
5. Click "Execute Workflow (User Requested)" button
6. Workflow executes NOW (not before)

**Expected Console Output:**
```
🚀 Executing workflow: [Workflow Name]
📍 Executing node: [Node Name] ([Node Type])
✅ Workflow completed successfully
```

### 7. Test Chat Interface

**Type in chat:** "grade"

**Expected:**
- Modal opens for "Grade Assignments" workflow
- Workflow does NOT execute yet
- User must click Execute button

### 8. Verify Database Connection

**Before connecting:**
- ⚠️ Demo Mode Active alert shown
- Workflows cannot execute (no data source)

**After connecting:**
- ✓ Connected! message shown
- Workflows can now execute
- Database queries work

### 9. Verify Lightweight Operation

**During execution:**
- Check Task Manager: Memory usage <100MB
- Check Network tab: Max 3 concurrent requests
- Check timing: 2s delay between batches

### 10. Verify Output Files

**After execution:**
- File downloads automatically
- CSV format for tasks 1 & 4
- PDF format for tasks 2 & 3

---

## Common Issues & Solutions

### Issue: Workflows execute on startup
**Solution:** Check that `useEffect` only calls `WorkflowRegistry.getInstance()`, NOT `executeWorkflow()`

### Issue: "No workflow found" error
**Solution:** Verify JSON files exist in `src/lib/n8n/workflows/`

### Issue: Import errors
**Solution:** Check that dashboard imports from:
- `@/components/RealWorkflowModal`
- `@/lib/n8n/WorkflowRegistry`
- `@/lib/n8n/RealWorkflowExecutor`

### Issue: Execute button disabled
**Solution:** 
1. Check task is active (toggle ON)
2. Check workflow exists for that task ID
3. Check database is connected

### Issue: High memory usage
**Solution:** Verify execution options:
- maxConcurrent: 3
- delayBetweenRequests: 2
- maxItems: 20

---

## Success Criteria

✅ All 4 workflow JSON files exist
✅ Dashboard loads without errors
✅ No automatic workflow execution
✅ Registry initializes with 4 workflows
✅ Manual execution works via button
✅ Chat keywords trigger workflow modal
✅ Database connection works
✅ AI API calls work (Groq)
✅ File export works (CSV/PDF)
✅ Memory usage <100MB
✅ No diagnostics errors
✅ UI shows "n8n JSON" badges

---

## Test Checklist

- [ ] Application starts successfully
- [ ] Console shows registry initialized
- [ ] No automatic execution on startup
- [ ] "Manage Tasks" button works
- [ ] All 4 tasks show "n8n JSON" badge
- [ ] Execute button opens modal
- [ ] Modal shows workflow details
- [ ] Execute button in modal works
- [ ] Workflow executes successfully
- [ ] Progress bar updates
- [ ] Results display correctly
- [ ] File downloads automatically
- [ ] Chat keywords work
- [ ] Database connection works
- [ ] Memory usage is low
- [ ] No console errors

---

## Performance Benchmarks

**Expected Performance:**
- Startup: <1 second
- Registry load: <100ms
- Modal open: <50ms
- Workflow execution: 10-60 seconds (depends on data size)
- Memory usage: 50-100MB during execution
- File export: <1 second

**If performance is worse:**
- Check maxConcurrent setting (should be 3)
- Check delayBetweenRequests (should be 2s)
- Check maxItems (should be 20)
- Check database connection speed

---

## Final Verification

Run this command to check all files:
```bash
# Check all required files exist
test -f src/lib/n8n/workflows/grade-assignments.json && \
test -f src/lib/n8n/workflows/generate-rubric.json && \
test -f src/lib/n8n/workflows/student-analytics.json && \
test -f src/lib/n8n/workflows/generate-feedback.json && \
test -f src/lib/n8n/WorkflowRegistry.ts && \
test -f src/lib/n8n/RealWorkflowExecutor.ts && \
test -f src/components/RealWorkflowModal.tsx && \
echo "✅ All files present" || echo "❌ Missing files"
```

---

**Status:** Ready for testing
**Last Updated:** Context Transfer Session
