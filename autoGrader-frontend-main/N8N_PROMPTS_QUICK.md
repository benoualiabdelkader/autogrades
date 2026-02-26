# ⚡ Quick Copy Prompts for n8n

## 📝 Task 1: Grade Assignments

```
Create an n8n workflow:
1. Start node receives: studentId, assignmentId, assignmentText
2. HTTP POST to http://localhost:3000/api/groq with body: {"prompt": "Grade this assignment: [text]"}
3. Function node extracts: grade (0-100), feedback, strengths[], improvements[]
4. Set node formats output: {studentId, assignmentId, grade, feedback, strengths, improvements, timestamp}
5. HTTP POST to http://localhost:3000/api/save-grade
6. Add error handling for API failures
Return complete grading result
```

---

## 📋 Task 2: Generate Rubric

```
Create an n8n workflow:
1. Start node receives: courseName, assignmentType, objectives[], totalPoints
2. Function node creates prompt: "Create grading rubric for [type] in [course]. Objectives: [list]. Points: [total]. Include criteria, point breakdown, performance levels"
3. HTTP POST to http://localhost:3000/api/groq
4. Function node structures: {courseName, assignmentType, totalPoints, criteria[{name, points, levels{excellent, good, fair, poor}}]}
5. HTTP POST to http://localhost:3000/api/save-rubric
Return structured rubric
```

---

## 📊 Task 3: Student Analytics

```
Create an n8n workflow:
1. Start node receives: courseId, timePeriod, analysisType
2. HTTP GET from http://localhost:3000/api/moodle/students
3. Function calculates: avgGrade, engagementRate, completionRate, atRiskStudents (grade<50 OR engagement<30%)
4. Function performs stats: mean, median, stdDev, distribution, trends
5. HTTP POST to http://localhost:3000/api/groq for AI insights
6. Set node formats: {summary{totalStudents, avgGrade, engagementRate, atRiskCount}, atRiskStudents[], recommendations, trends}
7. HTTP POST to save report
Return analytics report
```

---

## 💬 Task 4: Generate Feedback

```
Create an n8n workflow:
1. Start node receives: studentId, name, grade, recentAssignments[], attendance, participation
2. Function analyzes: trend (improving/stable/declining), strengths, weaknesses
3. HTTP POST to http://localhost:3000/api/groq with prompt: "Generate encouraging feedback for [name]. Grade: [grade]. Trend: [trend]. Strengths: [list]. Improvements: [list]. Make it supportive and actionable"
4. Function structures: {studentId, name, overallFeedback, strengths[], improvements[], actionItems[], encouragement, nextSteps}
5. HTTP POST to save feedback
Return personalized feedback
```

---

## 🎯 Task 5: Auto-Check Assignment

```
Create an n8n workflow:
1. Start node receives: assignmentFile, requirements, checkPlagiarism, isCode
2. Function validates: fileType, wordCount, requiredSections
3. IF isCode: HTTP POST to code analysis API
4. IF checkPlagiarism: HTTP POST to plagiarism API
5. HTTP POST to http://localhost:3000/api/groq for content analysis
6. Function compiles: {submissionId, formatCheck{passed, issues[]}, contentCheck{requirementsMet, quality, suggestions[]}, plagiarismCheck{score, status}, overallStatus, feedback}
7. HTTP POST to update status
Return check report
```

---

## 🔔 Task 6: Student Alerts

```
Create an n8n workflow:
1. Schedule Trigger (every 6 hours)
2. HTTP GET recent student data
3. Function checks: gradeDrop>10, missedClasses>2, noSubmission>7days, engagement<20%
4. IF alerts exist:
   - Function categorizes: critical/warning/info
   - Loop each alert: HTTP POST to AI for message
   - Split: Email student, Email teacher, Save to DB
5. Set node logs all alerts
Return alert log
```

---

## 📈 Task 7: Progress Tracker

```
Create an n8n workflow:
1. Start node receives: studentId, courseId, startDate, endDate
2. HTTP GET historical data: grades, submissions, attendance, engagement
3. Function calculates: gradeTrajectory, submissionConsistency, improvementRate, predictedFinalGrade
4. Function identifies: milestones, achievements, challenges
5. HTTP POST to http://localhost:3000/api/groq for progress narrative
6. Set node creates: {studentId, period, metrics{startGrade, currentGrade, improvement, trajectory, predictedFinal}, milestones[], narrative, chartData[]}
7. HTTP POST to save report
Return progress report
```

---

## 🎓 Task 8: Course Insights

```
Create an n8n workflow:
1. Start node receives: courseId, period
2. Parallel branches fetch: performance data, completion rates, engagement metrics, feedback
3. Merge all data
4. Function calculates: classAverage, passFailRate, challengingTopics, engagingContent, dropoutRisk
5. HTTP POST to http://localhost:3000/api/groq for insights
6. Function creates: {courseId, period, metrics, insights[], recommendations[], predictions{expectedPassRate, atRiskCount}}
7. HTTP POST to save insights
Return course insights
```

---

## 🚀 Bonus: Batch Grading

```
Create an n8n workflow:
1. Start node receives: assignments[] (array of submissions)
2. Loop node iterates through each assignment
3. For each: HTTP POST to http://localhost:3000/api/groq
4. Function aggregates all results
5. Function calculates: classAverage, distribution, outliers
6. Set node formats: {totalGraded, classAverage, results[{studentId, grade, feedback}], statistics}
7. HTTP POST to save batch results
Return batch grading report
```

---

## 🔄 Bonus: Automated Reminders

```
Create an n8n workflow:
1. Schedule Trigger (daily at 9 AM)
2. HTTP GET upcoming deadlines (next 3 days)
3. HTTP GET students with incomplete assignments
4. Function matches: students × deadlines
5. Loop each student:
   - HTTP POST to AI for personalized reminder
   - Email node sends reminder
6. Set node logs all reminders sent
Return reminder log
```

---

## 📧 Bonus: Weekly Report

```
Create an n8n workflow:
1. Schedule Trigger (every Monday 8 AM)
2. Parallel branches:
   - HTTP GET weekly grades
   - HTTP GET weekly attendance
   - HTTP GET weekly engagement
3. Merge data
4. Function summarizes: weeklyAverage, trends, highlights, concerns
5. HTTP POST to http://localhost:3000/api/groq for narrative
6. Set node formats email: {subject, body, attachments}
7. Email node sends to teacher
Return report sent confirmation
```

---

## 💡 Usage Tips

### Copy-Paste Steps:
1. Copy the prompt you need
2. Open n8n
3. Click "Generate with AI" or use AI Agent
4. Paste the prompt
5. Review and adjust
6. Test the workflow
7. Export as JSON

### Customization:
- Replace `localhost:3000` with your API URL
- Adjust thresholds (grade < 50, etc.)
- Add/remove nodes as needed
- Change languages in AI prompts

### Testing:
- Use sample data first
- Check each node output
- Verify error handling
- Test edge cases

---

## 🎯 Quick Reference

| Task | Prompt Number | Complexity |
|------|---------------|------------|
| Grade Assignments | 1 | ⭐⭐ |
| Generate Rubric | 2 | ⭐⭐ |
| Student Analytics | 3 | ⭐⭐⭐ |
| Generate Feedback | 4 | ⭐⭐ |
| Auto-Check | 5 | ⭐⭐⭐ |
| Student Alerts | 6 | ⭐⭐⭐⭐ |
| Progress Tracker | 7 | ⭐⭐⭐ |
| Course Insights | 8 | ⭐⭐⭐⭐ |
| Batch Grading | Bonus | ⭐⭐⭐ |
| Reminders | Bonus | ⭐⭐ |
| Weekly Report | Bonus | ⭐⭐⭐ |

---

**Pro Tip:** Start with Task 1 (simplest), test it, then move to more complex workflows!
