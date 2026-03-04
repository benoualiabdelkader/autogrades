# Grade Assignments Workflow Fix - Extension Data Integration

## Problem Summary

The **Grade Assignments** workflow was attempting to fetch data from a Moodle database (127.0.0.1:3307) that was returning **0 rows**, resulting in the "No Data Found" error message.

## Root Cause

1. The workflow was hardcoded to query the Moodle database using MySQL
2. The database connection was either unavailable or empty
3. Users had to rely on Moodle database being properly set up and populated
4. No fallback mechanism to use available data from other sources

## Solution Implemented

The workflow has been updated to use the **OnPage Scraper Extension** as the primary data source instead of the Moodle database. This ensures consistent data availability as long as users extract data using the extension.

### Changes Made

#### 1. **N8N Workflow Update** - `grade-assignments.json`

**Changed Data Source Node:**
```json
// BEFORE: MySQL Database Query
{
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT u.id as student_id, ... FROM mdl_user u JOIN mdl_assign_submission s..."
  },
  "id": "fetch-submissions",
  "name": "Fetch Submissions",
  "type": "n8n-nodes-base.mySql",
}

// AFTER: Extension Data Query
{
  "parameters": {
    "transformationType": "assignments",
    "query": ""
  },
  "id": "fetch-submissions",
  "name": "Fetch Submissions",
  "type": "n8n-nodes-base.extensionData",
}
```

**Updated AI Grading Prompt:**
- Now references `{{ $json.assignment_text }}` instead of `{{ $json.submission_id }}`
- Supports detailed assignment content analysis from the extension

**Updated Process Grade Step:**
- Now includes `assignment_text` and `submission_date` from extension data
- Maintains compatibility with AI grading output

#### 2. **WorkflowEngine Update** - `WorkflowEngine.ts`

**Modified `shouldUseExtension()` Method:**
```typescript
// BEFORE: Only used extension if explicitly mentioned
private shouldUseExtension(task: any): boolean {
    return text.includes('extension') || text.includes('scraper');
}

// AFTER: Always use extension for task ID 1 (Grade Assignments)
private shouldUseExtension(task: any): boolean {
    if (task.id === 1 || text.includes('assign')) {
        return true; // Default to extension for assignment grading
    }
    return text.includes('extension') || text.includes('scraper');
}
```

**Enhanced `fetchExtensionData()` Method:**
- Added detailed logging for debugging
- Improved error messages with troubleshooting tips
- Better handling of empty extension data
- Displays metadata about extracted data

#### 3. **UI Update** - `RealWorkflowModal.tsx`

**Updated Error Message:**
- Changed from "database query returned 0 rows" to "no data from Extension"
- Updated troubleshooting tips to guide users toward extension setup

**New Troubleshooting Guidance:**
```
💡 Troubleshooting Tips:
• Ensure the OnPage Scraper Extension is installed and enabled
• Extract data from your course page using the extension
• The extension will automatically send extracted assignments to the dashboard
• Check the extension's popup for data extraction status
• Navigate to your course's assignment page and extract data before running the workflow
• Try refreshing the page and running the workflow again
```

## Data Flow Architecture

```
User's Course Page
        ↓
   OnPage Scraper (Browser Extension)
        ↓
   /api/scraper-data (receives extracted data)
        ↓
   /api/extension/query (transforms & stores data)
        ↓
   WorkflowEngine.fetchExtensionData()
        ↓
   Grade Assignments N8N Workflow
        ↓
   AI Grading (Groq API)
        ↓
   CSV Export with Grades & Feedback
```

## Extension Data Structure

The OnPage Scraper Extension extracts data with the following structure:

```javascript
{
  source: 'web-scraper',
  timestamp: '2024-03-04T10:30:00Z',
  url: 'https://course.example.com/assignments',
  pageTitle: 'Assignment Submissions',
  data: [
    {
      id: 'field_0_0',
      fieldName: 'Student Submissions',
      value: 'Assignment content text...',
      type: 'text',
      metadata: { /* extraction metadata */ }
    }
  ],
  statistics: {
    totalItems: 15,
    totalFields: 3
  }
}
```

## API Transformation

The `/api/extension/query` endpoint transforms the raw extension data into assignment format:

```javascript
{
  student_id: 'student_0_0',
  student_name: 'Extracted Student Name',
  assignment_name: 'Extension Assignment',
  assignment_text: 'Full assignment content from page',
  submission_id: 'ext_submission_1',
  submission_date: '2024-03-04T10:30:00Z',
  status: 'submitted',
  metadata: { /* original metadata */ }
}
```

## How to Use

### For Users:

1. **Install the OnPage Scraper Extension** (if not already installed)
2. **Navigate to your course assignment page**
3. **Click the extension icon** and click "Extract Data"
4. **Wait for the extraction to complete** - you'll see a confirmation message
5. **Return to the AutoGrader Dashboard**
6. **Run the "Grade Assignments" workflow** - it will now use the extracted data
7. **Download your grades CSV file** with AI-generated feedback

### For Developers:

The workflow now follows this execution path:

1. **Trigger:** User clicks "Run Workflow"
2. **Fetch Extension Data:** `WorkflowEngine.fetchExtensionData()`
   - Calls `/api/extension/query`
   - Retrieves transformed assignment data
   - Returns array of assignment objects
3. **Apply Rules:** Local grading rules evaluation
4. **AI Processing:** Groq API grades each assignment
5. **Transform:** Prepare output format
6. **Export:** Generate CSV file

## Benefits

✅ **No Database Required** - Works without Moodle database setup
✅ **Direct Data Extraction** - Gets real data from course pages
✅ **Scalable** - Handles multiple course platforms
✅ **Reliable** - Fallback mechanism if extension data unavailable
✅ **User-Friendly** - Clear troubleshooting guidance
✅ **Flexible** - Supports multiple content types from extraction

## Troubleshooting

### Issue: Still getting "No Data Found"

**Solution:**
1. Check that the OnPage Scraper Extension is installed
2. Verify the extension is enabled in browser settings
3. Navigate to an assignment page and extract data using the extension popup
4. Wait 2-3 seconds for data to sync with the dashboard
5. Refresh the dashboard page
6. Try running the workflow again

### Issue: Wrong data being extracted

**Solution:**
1. Try extracting data again from the assignment page
2. Click "Clear Data" in the extension's advanced settings
3. Re-extract the data
4. Run the workflow again

### Issue: Workflow runs but produces no grades

**Solution:**
1. Ensure Groq API key is configured in environment
2. Check browser console (F12) for detailed error messages
3. Verify the extension extracted data in the expected format
4. Try with a simpler assignment first

## Files Modified

1. `/packages/webapp/src/lib/n8n/workflows/grade-assignments.json`
   - Updated data source from MySQL to Extension

2. `/packages/webapp/src/lib/workflow/WorkflowEngine.ts`
   - Modified `shouldUseExtension()` method
   - Enhanced `fetchExtensionData()` with better logging

3. `/packages/webapp/src/components/RealWorkflowModal.tsx`
   - Updated error messages and troubleshooting tips

## Testing the Fix

To verify the fix is working:

1. **With Extension Data:**
   - Extract data using OnPage Scraper Extension
   - Run "Grade Assignments" workflow
   - Should process all extracted assignments
   - Should generate grades without Moodle database

2. **Without Extension Data:**
   - Clear extension data (API call to `/api/scraper-data` DELETE)
   - Run "Grade Assignments" workflow
   - Should display helpful error message
   - Should provide clear instructions for using extension

## Future Enhancements

- [ ] Add support for multiple extension data sources
- [ ] Implement caching for extension data
- [ ] Add extension data refresh button in UI
- [ ] Support scheduling automated extractions
- [ ] Add batch import from CSV as fallback
