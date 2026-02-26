"use client";

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faPaperPlane,
  faGear,
  faBrain,
  faChartLine,
  faUsers,
  faCheckCircle,
  faFire,
  faBolt,
  faArrowTrendUp,
  faFilter,
  faInfoCircle,
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons';

export default function Home() {
  const [chatInput, setChatInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    dbhost: '127.0.0.1',
    dbport: '3307',
    dbname: 'moodle',
    dbuser: 'root',
    dbpass: '',
    prefix: 'mdl_'
  });
  const [dbConnected, setDbConnected] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState('');
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Grade Assignments',
      description: 'Analyze and grade student assignments based on rubric criteria',
      prompt: 'You are an expert grading assistant. Analyze student assignments based on the provided rubric criteria. Provide detailed feedback on strengths and areas for improvement. Be fair, constructive, and specific in your evaluation.',
      icon: '📝',
      active: true
    },
    {
      id: 2,
      title: 'Generate Rubric',
      description: 'Create comprehensive grading rubrics',
      prompt: 'You are a rubric design expert. Create a comprehensive grading rubric with clear criteria, point distribution, and performance levels. Ensure the rubric is fair, measurable, and aligned with learning objectives.',
      icon: '📋',
      active: true
    },
    {
      id: 3,
      title: 'Student Analytics',
      description: 'Analyze student performance and identify at-risk students',
      prompt: 'You are a data analyst specializing in education. Analyze student performance data, identify patterns, predict outcomes, and flag at-risk students. Provide actionable insights and recommendations.',
      icon: '📊',
      active: true
    },
    {
      id: 4,
      title: 'Generate Feedback',
      description: 'Create personalized student feedback',
      prompt: 'You are a supportive educator. Generate personalized, constructive feedback for students. Focus on specific achievements, areas for growth, and actionable next steps. Be encouraging and specific.',
      icon: '💬',
      active: true
    }
  ]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', prompt: '', icon: '🤖' });
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'System initialized. I have analyzed the latest student data. Enrollment is stable, but engagement in CS104 has dropped by 18%.',
      time: '10:24 AM'
    },
    {
      role: 'user',
      content: 'Why is engagement dropping in Course CS104?',
      time: '10:25 AM'
    },
    {
      role: 'ai',
      content: 'Based on event logs, students are struggling with Module 4: Data Structures. Avg time spent on the quiz is only 4 minutes vs 12 minutes average. They are likely skipping content.',
      time: '10:25 AM'
    }
  ]);
  const [isThinking, setIsThinking] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    studentsAtRisk: 12,
    engagementRate: 88,
    courseCompletion: 64.2,
    activeSessions: 450
  });
  const [students, setStudents] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      // Check if user typed "task" to open task manager
      if (chatInput.trim().toLowerCase() === 'task') {
        setShowTaskManager(true);
        setChatInput('');
        return;
      }

      setMessages([...messages, { role: 'user', content: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setChatInput('');
      setIsThinking(true);
    }
  };

  const handleAddTask = () => {
    if (newTask.title && newTask.prompt) {
      setTasks([...tasks, {
        id: tasks.length + 1,
        title: newTask.title,
        description: newTask.description,
        prompt: newTask.prompt,
        icon: newTask.icon || '🤖',
        active: true
      }]);
      setNewTask({ title: '', description: '', prompt: '', icon: '🤖' });
    }
  };

  const handleDeleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleToggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, active: !task.active } : task
    ));
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
  };

  const handleSaveEdit = () => {
    if (editingTask) {
      setTasks(tasks.map(task =>
        task.id === editingTask.id ? editingTask : task
      ));
      setEditingTask(null);
    }
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    setShowTaskManager(false);
    // Add system message about task activation
    setMessages([...messages, {
      role: 'ai',
      content: `${task.icon} Workflow "${task.title}" activated. I'm now configured to: ${task.description}. How can I assist you?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleDbConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDbConfig({
      ...dbConfig,
      [e.target.name]: e.target.value
    });
  };

  const testDbConnection = async () => {
    setDbTesting(true);
    setDbStatus('');

    try {
      const response = await fetch('/api/moodle/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbConfig)
      });

      const data = await response.json();

      if (data.success) {
        setDbConnected(true);
        setDbStatus(`✓ Connected! Found ${data.stats?.totalUsers || 0} users`);
        localStorage.setItem('moodleConfig', JSON.stringify(dbConfig));

        // Add success message to chat
        setMessages([...messages, {
          role: 'ai',
          content: `🗄️ Database connected successfully! I can now access real-time data from ${data.stats?.totalUsers || 0} users and ${data.stats?.totalCourses || 0} courses.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // Fetch dashboard data immediately
        setTimeout(() => fetchDashboardData(), 500);
      } else {
        setDbConnected(false);
        setDbStatus(`✗ Connection failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      setDbConnected(false);
      setDbStatus(`✗ Error: ${error.message}`);
    } finally {
      setDbTesting(false);
    }
  };

  const loadSavedDbConfig = () => {
    const saved = localStorage.getItem('moodleConfig');
    if (saved) {
      setDbConfig(JSON.parse(saved));
      setDbStatus('Loaded saved configuration');
    }
  };

  const fetchDashboardData = async () => {
    if (!dbConnected) return;

    setLoadingData(true);

    try {
      // Fetch statistics
      const statsResponse = await fetch(`/api/moodle/stats?${new URLSearchParams(dbConfig as any)}`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setDashboardStats({
          studentsAtRisk: statsData.stats.studentsAtRisk,
          engagementRate: statsData.stats.engagementRate,
          courseCompletion: statsData.stats.courseCompletion,
          activeSessions: statsData.stats.activeSessions
        });
      }

      // Fetch students
      const studentsResponse = await fetch(`/api/moodle/students?${new URLSearchParams(dbConfig as any)}`);
      const studentsData = await studentsResponse.json();

      if (studentsData.success) {
        setStudents(studentsData.students);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Auto-fetch data when connected
  React.useEffect(() => {
    if (dbConnected) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbConnected]);

  // Load saved config on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('moodleConfig');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      setDbConfig(savedConfig);
      // Auto-connect if config exists
      setTimeout(() => {
        // Call test connection with saved config
        const connectWithSaved = async () => {
          setDbTesting(true);
          try {
            const response = await fetch('/api/moodle/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(savedConfig)
            });
            const data = await response.json();
            if (data.success) {
              setDbConnected(true);
              setDbStatus(`✓ Auto-connected! Found ${data.stats?.totalUsers || 0} users`);
            }
          } catch (error) {
            console.error('Auto-connect failed:', error);
          } finally {
            setDbTesting(false);
          }
        };
        connectWithSaved();
      }, 1000);
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-background-dark">
      {/* Main Content Area (75%) */}
      <main className="w-3/4 h-full overflow-y-auto custom-scrollbar bg-background-dark p-8 border-r border-primary/10">

        {!showTaskManager ? (
          <>
            {/* Connection Alert */}
            {!dbConnected && (
              <div className="glass-panel p-4 rounded-xl mb-6 border-l-4 border-l-yellow-500/50 bg-yellow-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-yellow-400 font-semibold">Demo Mode Active</p>
                      <p className="text-slate-400 text-sm">Connect to Moodle database to view real-time data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDbSettings(true)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-lg font-medium transition-all text-sm"
                  >
                    Connect Now
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                  AI AutoGrader Analytics Dashboard
                  <span className="flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    <span className={`size-2 rounded-full bg-primary ${dbConnected ? 'pulse-dot' : 'opacity-50'}`}></span>
                    {dbConnected ? 'Live Data Sync' : 'Demo Mode'}
                  </span>
                  {loadingData && (
                    <span className="flex items-center gap-2 text-xs font-medium bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                      Updating...
                    </span>
                  )}
                </h1>
                <p className="text-slate-400 mt-1 flex items-center gap-2">
                  <span className="text-sm">🔗</span>
                  Connected to Education Platform • <span className="text-primary/80 font-mono">v2.4.1</span>
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={fetchDashboardData}
                  disabled={!dbConnected || loadingData}
                  className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className={loadingData ? 'animate-spin' : ''}>🔄</span>
                  {loadingData ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <button className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                  <FontAwesomeIcon icon={faDownload as any} className="text-lg" />
                  Export Report
                </button>
                <div className="size-10 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10"></div>
                </div>
              </div>
            </header>

            {/* Insight Cards Grid */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-red-500/50">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Students at Risk</p>
                <h3 className="text-3xl font-bold text-slate-100 mt-1">
                  {loadingData ? '...' : dashboardStats.studentsAtRisk}
                </h3>
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faArrowTrendUp as any} className="text-sm" />
                  Requires attention
                </p>
              </div>
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-primary/50">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Engagement Rate</p>
                <h3 className="text-3xl font-bold text-slate-100 mt-1">
                  {loadingData ? '...' : `${dashboardStats.engagementRate}%`}
                </h3>
                <p className="text-primary text-xs mt-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faBolt as any} className="text-sm" />
                  Last 7 days activity
                </p>
              </div>
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-blue-500/50">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Course Completion</p>
                <h3 className="text-3xl font-bold text-slate-100 mt-1">
                  {loadingData ? '...' : `${dashboardStats.courseCompletion}%`}
                </h3>
                <p className="text-blue-400 text-xs mt-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle as any} className="text-sm" />
                  On track for semester
                </p>
              </div>
              <div className="glass-panel p-5 rounded-xl border-l-4 border-l-purple-500/50">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Active Sessions</p>
                <h3 className="text-3xl font-bold text-slate-100 mt-1">
                  {loadingData ? '...' : dashboardStats.activeSessions}
                </h3>
                <p className="text-purple-400 text-xs mt-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faUsers as any} className="text-sm" />
                  Real-time users
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Grade Trends Line Chart */}
              <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-slate-100">Grade Progression Trends</h4>
                  <FontAwesomeIcon icon={faEllipsisV as any} className="text-slate-400 cursor-pointer hover:text-primary transition-colors" />
                </div>
                <div className="h-64 flex items-end gap-2 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 150">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'rgba(0, 255, 136, 0.2)' }} />
                        <stop offset="100%" style={{ stopColor: 'rgba(0, 255, 136, 0)' }} />
                      </linearGradient>
                    </defs>
                    <path className="neon-glow" d="M0 120 Q 50 100, 100 110 T 200 60 T 300 80 T 400 40" fill="none" stroke="#00ff88" strokeWidth="3" />
                    <path d="M0 120 Q 50 100, 100 110 T 200 60 T 300 80 T 400 40 L 400 150 L 0 150 Z" fill="url(#gradient)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col justify-between py-2 text-[10px] text-slate-500 font-mono pointer-events-none">
                    <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap */}
              <div className="glass-panel p-6 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-slate-100">Weekly Activity Heatmap</h4>
                  <FontAwesomeIcon icon={faInfoCircle as any} className="text-slate-400 cursor-pointer" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (
                    <div key={day} className="space-y-2">
                      {[10, 20, 40, 10, 60].map((intensity, i) => (
                        <div key={i} className={`h-8 rounded ${intensity > 50 ? 'neon-glow' : ''}`} style={{ backgroundColor: `rgba(0, 255, 136, ${intensity / 100})` }}></div>
                      ))}
                      <p className="text-[10px] text-center text-slate-500">{day}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student Data Table */}
            <div className="glass-panel rounded-xl overflow-hidden mb-8">
              <div className="p-6 border-b border-primary/10 flex justify-between items-center">
                <h4 className="text-lg font-semibold text-slate-100">High-Risk Student Watchlist</h4>
                <div className="flex gap-2">
                  <input
                    className="bg-background-dark/50 border border-primary/20 rounded-lg px-3 py-1 text-sm focus:ring-1 focus:ring-primary outline-none text-slate-200"
                    placeholder="Filter students..."
                    type="text"
                  />
                  <button className="bg-primary/10 hover:bg-primary/20 p-2 rounded-lg transition-colors">
                    <FontAwesomeIcon icon={faFilter as any} className="text-sm text-primary" />
                  </button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-primary/5 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student Name</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Engagement</th>
                    <th className="px-6 py-4 font-semibold">Predicted Grade</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-primary/5">
                  {loadingData ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                          Loading student data...
                        </div>
                      </td>
                    </tr>
                  ) : students.length > 0 ? (
                    students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                          <div className="size-8 rounded-full bg-slate-800 flex items-center justify-center border border-primary/10 text-xs text-slate-300">
                            {student.initials}
                          </div>
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{student.course}</td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-${student.color}-500`} style={{ width: `${student.engagement}%` }}></div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-${student.color}-400 font-mono`}>{student.grade}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded bg-${student.color}-500/10 text-${student.color}-400 text-[10px] font-bold`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        {dbConnected ? 'No at-risk students found' : 'Connect to database to view student data'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Task Manager Interface */
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                  🤖 AI Workflow Library
                  <span className="flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    {tasks.filter(t => t.active).length} Available Workflows
                  </span>
                </h1>
                <p className="text-slate-400 mt-1">Select a workflow to activate specialized AI behavior</p>
              </div>
              <button
                onClick={() => setShowTaskManager(false)}
                className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Current Active Workflow */}
            {selectedTask && (
              <div className="glass-panel p-6 rounded-xl mb-6 border-l-4 border-l-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{selectedTask.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Currently Active Workflow</h3>
                      <p className="text-slate-100 font-medium">{selectedTask.title}</p>
                      <p className="text-sm text-slate-400 mt-1">{selectedTask.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            )}

            {/* Add New Workflow */}
            <div className="glass-panel p-6 rounded-xl mb-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <span className="text-primary">+</span> Create New Workflow
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Workflow Name</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g., Grade Assignments"
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Icon</label>
                  <input
                    type="text"
                    value={newTask.icon}
                    onChange={(e) => setNewTask({ ...newTask, icon: e.target.value })}
                    placeholder="🤖"
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Description</label>
                  <input
                    type="text"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Brief description of what this workflow does"
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">AI System Prompt</label>
                  <textarea
                    value={newTask.prompt}
                    onChange={(e) => setNewTask({ ...newTask, prompt: e.target.value })}
                    placeholder="Define the AI's role, behavior, and instructions for this workflow..."
                    rows={4}
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleAddTask}
                  className="col-span-2 bg-primary hover:bg-primary/90 text-background-dark px-6 py-3 rounded-lg font-semibold transition-all neon-glow"
                >
                  Create Workflow
                </button>
              </div>
            </div>

            {/* Workflow Cards Grid */}
            <div className="grid grid-cols-2 gap-6">
              {tasks.map((task) => (
                <div key={task.id} className={`glass-panel rounded-xl overflow-hidden transition-all hover:border-primary/30 ${!task.active ? 'opacity-50' : ''} ${selectedTask?.id === task.id ? 'border-2 border-primary' : ''}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{task.icon}</div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-100">{task.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${task.active
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                      >
                        {task.active ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {editingTask?.id === task.id ? (
                      <div className="space-y-3 mb-4">
                        <input
                          type="text"
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                          className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                        />
                        <input
                          type="text"
                          value={editingTask.description}
                          onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                          className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                        />
                        <textarea
                          value={editingTask.prompt}
                          onChange={(e) => setEditingTask({ ...editingTask, prompt: e.target.value })}
                          rows={3}
                          className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="bg-primary text-background-dark px-4 py-1 rounded-lg text-sm font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="bg-slate-700 text-slate-300 px-4 py-1 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">System Prompt</p>
                        <p className="text-sm text-slate-300 leading-relaxed bg-background-dark/30 p-3 rounded-lg border border-primary/10">
                          {task.prompt}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectTask(task)}
                        disabled={!task.active}
                        className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {selectedTask?.id === task.id ? '✓ Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Fixed AI Chatbot Panel (25%) */}
      <aside className="w-1/4 h-full glass-panel flex flex-col relative z-10 border-l border-primary/30">
        {/* Chat Header */}
        <div className="p-4 border-b border-primary/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <FontAwesomeIcon icon={faBrain as any} />
                AI Intelligence
              </h2>
              {selectedTask && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20 flex items-center gap-1">
                  {selectedTask.icon} {selectedTask.title}
                </span>
              )}
              {dbConnected && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20 flex items-center gap-1">
                  🗄️ DB Connected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDbSettings(!showDbSettings)}
                className={`text-slate-400 hover:text-primary transition-all ${showDbSettings ? 'text-primary' : ''}`}
                title="Database Settings"
              >
                🗄️
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`text-slate-400 hover:text-primary transition-all ${showSettings ? 'text-primary rotate-90' : ''}`}
                title="AI Settings"
              >
                <FontAwesomeIcon icon={faGear as any} />
              </button>
            </div>
          </div>

          {/* Database Settings Panel */}
          {showDbSettings && (
            <div className="mt-3 space-y-3 animate-fade-in border-t border-primary/10 pt-3">
              <h3 className="text-xs uppercase text-slate-400 font-bold tracking-widest">Database Connection</h3>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="dbhost"
                    value={dbConfig.dbhost}
                    onChange={handleDbConfigChange}
                    placeholder="Host"
                    className="bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                  />
                  <input
                    type="text"
                    name="dbport"
                    value={dbConfig.dbport}
                    onChange={handleDbConfigChange}
                    placeholder="Port"
                    className="bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                  />
                </div>

                <input
                  type="text"
                  name="dbname"
                  value={dbConfig.dbname}
                  onChange={handleDbConfigChange}
                  placeholder="Database Name"
                  className="w-full bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                />

                <input
                  type="text"
                  name="dbuser"
                  value={dbConfig.dbuser}
                  onChange={handleDbConfigChange}
                  placeholder="Username"
                  className="w-full bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                />

                <input
                  type="password"
                  name="dbpass"
                  value={dbConfig.dbpass}
                  onChange={handleDbConfigChange}
                  placeholder="Password (optional)"
                  className="w-full bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                />

                <input
                  type="text"
                  name="prefix"
                  value={dbConfig.prefix}
                  onChange={handleDbConfigChange}
                  placeholder="Table Prefix"
                  className="w-full bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all"
                />
              </div>

              {dbStatus && (
                <div className={`text-xs p-2 rounded-lg ${dbConnected
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                  {dbStatus}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={testDbConnection}
                  disabled={dbTesting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-background-dark text-xs py-1.5 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {dbTesting ? 'Testing...' : 'Connect'}
                </button>
                <button
                  onClick={loadSavedDbConfig}
                  className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                >
                  Load
                </button>
              </div>
            </div>
          )}

          {/* AI Settings Panel - Only show when button is clicked */}
          {showSettings && (
            <div className="mt-3 space-y-2 animate-fade-in border-t border-primary/10 pt-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Model</label>
                <select className="bg-background-dark/80 border border-primary/20 text-xs rounded-lg p-1.5 text-slate-200 outline-none focus:border-primary transition-all">
                  <option>GPT-4o (Reasoning)</option>
                  <option>Claude 3.5 Sonnet</option>
                  <option>Custom AutoGrader-v2</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Mode</label>
                <div className="flex bg-background-dark/80 p-0.5 rounded-lg border border-primary/10">
                  <button className="flex-1 text-[9px] font-bold py-1 bg-primary text-background-dark rounded shadow-sm">PREDICTIVE</button>
                  <button className="flex-1 text-[9px] font-bold py-1 text-slate-400">DESCRIPTIVE</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" style={{ minHeight: '0' }}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end ml-auto' : 'items-start'} max-w-[90%]`}>
              <div className={msg.role === 'ai' ? 'glass-panel border-l-2 border-l-primary p-3 rounded-lg rounded-tl-none' : 'bg-slate-800/80 border border-slate-700 p-3 rounded-lg rounded-tr-none'}>
                <p className="text-xs leading-relaxed text-slate-200">
                  {msg.role === 'ai' && msg.content.includes('CS104') ? (
                    <>
                      {msg.content.split('CS104')[0]}
                      <span className="text-primary font-semibold">CS104</span>
                      {msg.content.split('CS104')[1]}
                    </>
                  ) : msg.role === 'ai' && msg.content.includes('Module 4: Data Structures') ? (
                    <>
                      {msg.content.split('Module 4: Data Structures')[0]}
                      <span className="text-primary font-bold">Module 4: Data Structures</span>
                      {msg.content.split('Module 4: Data Structures')[1]}
                    </>
                  ) : (
                    msg.content
                  )}
                </p>
              </div>
              <span className="text-[9px] text-slate-600 font-mono">{msg.role === 'ai' ? 'AI' : 'ADMIN'} • {msg.time}</span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-full w-fit">
              <div className="flex gap-1">
                <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
                <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '-0.5s' }}></div>
              </div>
              <span className="text-[10px] text-primary/70 font-bold uppercase tracking-widest italic">Analyzing Data...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-background-dark/80 backdrop-blur-md shrink-0">
          <div className="relative">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-slate-900 border border-primary/30 rounded-xl px-4 py-3 text-sm pr-12 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-16 custom-scrollbar text-slate-200"
              placeholder="Ask about student performance... (Type 'task' to manage AI tasks)"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90 text-background-dark size-8 rounded-lg flex items-center justify-center transition-all neon-glow"
            >
              <FontAwesomeIcon icon={faPaperPlane as any} className="text-sm" />
            </button>
          </div>
          <button
            onClick={() => setShowTaskManager(true)}
            className="mt-2 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span>🤖</span> Manage Tasks
          </button>
        </div>
      </aside>
    </div>
  );
}
