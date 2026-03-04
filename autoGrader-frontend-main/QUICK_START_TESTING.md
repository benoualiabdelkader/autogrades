# Grade Assignments Fix - Quick Start & Testing Guide

## 🚀 Quick Start

### Step 1: Verify Files Were Updated
Check that your changes match these core files:

**File 1: `grade-assignments.json`**
```bash
# Windows PowerShell
Get-Content "packages/webapp/src/lib/n8n/workflows/grade-assignments.json" |  Select-String "n8n-nodes-base.extensionData" | Select-Object -First 1
```
✅ Should find: `"type": "n8n-nodes-base.extensionData"`

**File 2: `WorkflowEngine.ts`** 
```bash
Get-Content "packages/webapp/src/lib/workflow/WorkflowEngine.ts" | Select-String "task.id === 1"
```
✅ Should find: `if (task.id === 1 || text.includes('assign')) {`

**File 3: `RealWorkflowModal.tsx`**
```bash
Get-Content "packages/webapp/src/components/RealWorkflowModal.tsx" | Select-String "OnPage Scraper Extension"
```
✅ Should find: `"no data from Extension"`

### Step 2: Start the Application

```bash
# From the root directory
cd autoGrader-frontend-main

# Install dependencies (if not already done)
npm install

# Build next.js
npm run build

# Start development server
npm run dev
```

The dashboard should be running at `http://localhost:3000` or `http://localhost:5173`

## 🧪 Testing the Fix

### Test Case 1: Without Extension Data

**What to do:**
1. Open the AutoGrader Dashboard
2. DON'T extract any data using the extension
3. Click "Grade Assignments" workflow
4. Click "Run Workflow"

**Expected Result:**
- See "No Data Found" message ⚠️
- See troubleshooting tip mentioning "OnPage Scraper Extension"
- NOT mentioning "Moodle database" or "127.0.0.1:3307"

**Verification Code:**
```bash
# Check for empty extension data
curl -s http://localhost:3000/api/scraper-data | ConvertFrom-Json | Select-Object payload
```
Output should show: `{"payload": null}` or empty

### Test Case 2: With Mock Extension Data

**What to do:**
1. Add mock data to your extension via API:

```bash
# PowerShell
$mockData = @{
    source = "web-scraper"
    timestamp = (Get-Date -Format "o")
    url = "http://example.com/assignments"
    pageTitle = "Mock Assignments"
    data = @(
        @{
            id = "student_1"
            fieldName = "Student A Submission"
            value = "This is a comprehensive solution to the assignment. It covers all required topics and demonstrates strong understanding."
            type = "text"
            metadata = @{}
        },
        @{
            id = "student_2"
            fieldName = "Student B Submission"  
            value = "A good attempt at the assignment with mostly correct answers."
            type = "text"
            metadata = @{}
        }
    )
    statistics = @{
        totalItems = 2
        totalFields = 1
    }
}

curl -X POST http://localhost:3000/api/scraper-data `
  -ContentType "application/json" `
  -Body ($mockData | ConvertTo-Json -Depth 10)
```

2. Return to the dashboard and click "Grade Assignments"
3. Click "Run Workflow"

**Expected Result:**
- See "Successfully Executed!" message ✅
- Shows "Processed 2 items in X.Xs" 
- Stats: 2 successful, 0 failed
- Workflow completes without errors

**Verification Code:**
```bash
# Check that data was stored
curl -s http://localhost:3000/api/scraper-data | ConvertFrom-Json | Select-Object -ExpandProperty payload | Measure-Object
```
Output should show: 2 items extracted

### Test Case 3: Full End-to-End with Real Extension

**What to do:**
1. Install OnPage Scraper Extension (if not installed)
2. Navigate to a course assignment page with student submissions
3. Click extension icon
4. Click "Extract Data" button
5. Wait for confirmation "Data extracted successfully"
6. Return to AutoGrader Dashboard
7. Refresh the page (F5)
8. Click "Grade Assignments" workflow
9. Click "Run Workflow"
10. Monitor the execution progress

**Expected Result:**
- Progress shows: "Fetching Extension Data" → "Processing Grades" → "Exporting Results"
- Final status: "Successfully Executed!"
- CSV file downloads with:
  - student_name
  - assignment_name  
  - assignment_text (first 100 chars shown)
  - grade (0-100)
  - feedback_text
  - strengths
  - improvements
  - submission_date

**Verification Steps:**
```
1. Check browser console (F12) for logs:
   ✅ "Fetched X items from Extension"
   ✅ "Extension query successful"
   
2. Verify CSV output:
   ✅ Has header row with all field names
   ✅ Has N data rows (one per assignment)
   ✅ Grades are numeric 0-100
   ✅ No Moodle-specific field names
```

## 🐛 Debugging Tips

### If "No Data Found" still appears:

1. **Check Extension Data Storage:**
```bash
# See what extension data is stored
curl -s http://localhost:3000/api/scraper-data | ConvertFrom-Json | Select-Object payload
```

2. **Check Extension Query API:**
```bash
# Test extension query directly
curl -X POST http://localhost:3000/api/extension/query `
  -ContentType "application/json" `
  -Body @'{"transformationType": "assignments"}'@
```

3. **Check Workflow Configuration:**
```bash
# Verify grade-assignments.json is correct
Get-Content packages/webapp/src/lib/n8n/workflows/grade-assignments.json
```
✅ Should contain `"n8n-nodes-base.extensionData"`

4. **Check Browser Console:**
Open developer tools (F12) and look for:
- Any red errors
- Extension fetch attempts
- API response status codes

### If CSV export fails:

1. **Check Groq API Key:**
```bash
# Verify environment variable is set
Get-Content .env.local | Select-String GROQ_API_KEY
```

2. **Check AI Processing Logs:**
Look in browser console for:
- "Processing with AI" messages
- API response status
- JSON parsing errors

3. **Try with fewer items:**
- Extract just 1-2 assignments
- Run workflow to test AI grading
- Check if issue is with specific items or system

## 📊 Expected Performance

| Operation | Expected Time |
|-----------|----------------|
| Extract 10 assignments | 3-5 seconds |
| Grade 10 assignments with AI | 20-30 seconds |
| Generate CSV | 1-2 seconds |
| Total end-to-end | < 60 seconds |

If taking longer, check:
- Network connection speed
- Groq API rate limits
- Number of concurrent workflows

## ✅ Success Criteria

The fix is working correctly when:

1. **❌ → ✅ Behavior Change**
   - Before: Always shows "No Data Found"
   - After: Shows "Successfully Executed!" when data exists

2. **❌ → ✅ Data Source Change**
   - Before: Tried to use Moodle database
   - After: Uses OnPage Scraper Extension data

3. **❌ → ✅ Instructions Change**
   - Before: Confusing database troubleshooting tips
   - After: Clear steps to use extension

4. **❌ → ✅ Reliability Improvement**
   - Before: 0% success rate (no database)
   - After: 100% when extension data provided

## 🔍 Code Changes Summary

### Files Changed:
1. **grade-assignments.json** - Data source node type
   - Line: Type changed from `mySql` to `extensionData`

2. **WorkflowEngine.ts** - Logic for choosing data source
   - Line: Added `task.id === 1` check to always use extension

3. **RealWorkflowModal.tsx** - Error messages and help text
   - Lines: Updated messages to reference Extension instead of database

4. **Documentation** - Added guides and checklists
   - New files: `GRADE_ASSIGNMENTS_FIX.md`, `IMPLEMENTATION_CHECKLIST.md`

## 🎯 Next Steps (Optional Enhancements)

After verifying the fix works, consider:

1. **Store results in database:**
   - Save grades to persistent storage
   - Track grading history

2. **Add Batch Operations:**
   - Grade multiple courses at once
   - Schedule automatic grading

3. **Extend to Other Workflows:**
   - Apply same extension-data pattern to other tasks
   - Generate Rubrics from extracted data
   - Create Student Analytics from extracted submissions

4. **Mobile Support:**
   - Optimize extension for mobile browsers
   - Mobile-friendly result display

## 📞 Support

If you encounter issues:

1. **Check Logs:**
   ```bash
   # View server logs
   npm run dev  # See console output
   ```

2. **Check Browser DevTools:**
   - F12 → Console tab for JavaScript errors
   - F12 → Network tab for API calls
   - F12 → Application tab for stored data

3. **Clear Cache if Needed:**
   ```bash
   # Clear extension data
   curl -X DELETE http://localhost:3000/api/scraper-data
   
   # Clear browser cache
   # Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   ```

4. **Restart Services:**
   ```bash
   # Kill any running processes
   npm run dev  # Will restart cleanly
   ```

## ✨ Verification Checklist

- [ ] Three main files updated correctly
- [ ] No Moodle database references in Grade Assignments workflow
- [ ] Error messages mention "Extension" not database
- [ ] Can run workflow without database connection
- [ ] CSV export works with extension data
- [ ] Troubleshooting guide updated
- [ ] Documentation files created
- [ ] End-to-end test passes with mock data
- [ ] End-to-end test passes with real extension data

## 🎉 Success!

When all tests pass, you've successfully fixed the Grade Assignments workflow to use the OnPage Scraper Extension data source instead of relying on an unreliable Moodle database connection.

**Result:**
- ✅ Workflow works reliably
- ✅ Clear user instructions
- ✅ Better error messages
- ✅ No database setup required
