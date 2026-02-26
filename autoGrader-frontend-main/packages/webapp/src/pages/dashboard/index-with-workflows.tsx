"use client";

import React, { useState, useEffect } from 'react';
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
  faEllipsisV,
  faPlay,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import WorkflowExecutionModal from '@/components/WorkflowExecutionModal';
import { WorkflowEngine } from '@/lib/workflow/WorkflowEngine';
import { TaskWorkflows } from '@/lib/workflow/TaskWorkflows';

export default function Home() {
  const [chatInput, setChatInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedTaskForWorkflow, setSelectedTaskForWorkflow] = useState<any>(null);

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
      prompt: 'You are an expert grading assistant. Analyze student assignments based on the provided rubric criteria. Provide detailed feedback on strengths and areas for improvement. Be fair, constructive, and specific in your evaluation. Respond in English or French only.',
      icon: '📝',
      active: true
    },
    {
      id: 2,
      title: 'Generate Rubric',
      description: 'Create comprehensive grading rubrics',
      prompt: 'You are a rubric design expert. Create a comprehensive grading rubric with clear criteria, point distribution, and performance levels. Ensure the rubric is fair, measurable, and aligned with learning objectives. Respond in English or French only.',
      icon: '📋',
      active: true
    },
    {
      id: 3,
      title: 'Student Analytics',
      description: 'Analyze student performance and identify at-risk students',
      prompt: 'You are a data analyst specializing in education. Analyze student performance data, identify patterns, predict outcomes, and flag at-risk students. Provide actionable insights and recommendations. Respond in English or French only.',
      icon: '📊',
      active: true
    },
    {
      id: 4,
      title: 'Generate Feedback',
      description: 'Create personalized student feedback',
      prompt: 'You are a supportive educator. Generate personalized, constructive feedback for students. Focus on specific achievements, areas for growth, and actionable next steps. Be encouraging and specific. Respond in English or French only.',
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

  // Initialize workflows for all tasks on mount
  useEffect(() => {
    const initializeWorkflows = async () => {
      await TaskWorkflows.buildAllWorkflows(tasks);
      console.log('✅ All workflows initialized');
    };

    initializeWorkflows();
  }, []);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const message = chatInput.trim().toLowerCase();

      // Check if user typed "task" to open task manager
      if (message === 'task' || message === 'tasks') {
        setShowTaskManager(true);
        setChatInput('');
        return;
      }

      // Check if user wants to execute a specific task
      const taskKeywords = {
        1: ['grade', 'grading', 'assignments', 'evaluate'],
        2: ['rubric', 'criteria', 'standards'],
        3: ['analytics', 'analysis', 'at-risk', 'performance'],
        4: ['feedback', 'comments', 'suggestions']
      };

      for (const [taskId, keywords] of Object.entries(taskKeywords)) {
        if (keywords.some(keyword => message.includes(keyword))) {
          const task = tasks.find(t => t.id === parseInt(taskId));
          if (task && task.active) {
            setSelectedTaskForWorkflow(task);
            setShowWorkflowModal(true);
            setMessages([...messages,
            { role: 'user', content: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            { role: 'ai', content: `🤖 Opening workflow for "${task.title}". This will process data from your Moodle database and use AI to ${task.description.toLowerCase()}.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
            setChatInput('');
            return;
          }
        }
      }

      setMessages([...messages, { role: 'user', content: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setChatInput('');
      setIsThinking(true);
    }
  };

  const handleAddTask = async () => {
    if (newTask.title && newTask.prompt) {
      const task = {
        id: tasks.length + 1,
        title: newTask.title,
        description: newTask.description,
        prompt: newTask.prompt,
        icon: newTask.icon || '🤖',
        active: true
      };

      setTasks([...tasks, task]);

      // Automatically build workflow for new task
      const engine = WorkflowEngine.getInstance();
      await engine.buildWorkflow(task);
      console.log(`✅ Workflow created for: ${task.title}`);

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

  const handleSaveEdit = async () => {
    if (editingTask) {
      setTasks(tasks.map(task =>
        task.id === editingTask.id ? editingTask : task
      ));

      // Rebuild workflow for edited task
      const engine = WorkflowEngine.getInstance();
      await engine.buildWorkflow(editingTask);
      console.log(`✅ Workflow updated for: ${editingTask.title}`);

      setEditingTask(null);
    }
  };

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    setShowTaskManager(false);

    // Open workflow execution modal
    setSelectedTaskForWorkflow(task);
    setShowWorkflowModal(true);

    setMessages([...messages, {
      role: 'ai',
      content: `${task.icon} Workflow "${task.title}" ready to execute. Click "Execute Workflow" to start processing.`,
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

        setMessages([...messages, {
          role: 'ai',
          content: `🗄️ Database connected successfully! I can now access real-time data from ${data.stats?.totalUsers || 0} users and ${data.stats?.totalCourses || 0} courses.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

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

  const fetchDashboardData = async () => {
    if (!dbConnected) return;

    setLoadingData(true);

    try {
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

  useEffect(() => {
    if (dbConnected) {
      fetchDashboardData();
    }
  }, [dbConnected]);

  useEffect(() => {
    const saved = localStorage.getItem('moodleConfig');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      setDbConfig(savedConfig);
      setTimeout(() => {
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
      {/* Main Content - Dashboard or Task Manager */}
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
                      <p className="text-slate-400 text-sm">Connect to Moodle database to enable workflows</p>
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
                  Connected to Education Platform • <span className="text-primary/80 font-mono">v2.5.0</span>
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

            {/* Dashboard content continues... */}
            {/* (Keep existing dashboard content) */}
          </>
        ) : (
          /* Task Manager Interface with Workflow Integration */
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                  🤖 AI Workflow Library
                  <span className="flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    {tasks.filter(t => t.active).length} Active Workflows
                  </span>
                </h1>
                <p className="text-slate-400 mt-1">Select a workflow to execute AI-powered tasks on your Moodle data</p>
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
                    placeholder="Define the AI's role, behavior, and instructions for this workflow... (English/French only)"
                    rows={4}
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleAddTask}
                  className="col-span-2 bg-primary hover:bg-primary/90 text-background-dark px-6 py-3 rounded-lg font-semibold transition-all neon-glow"
                >
                  Create Workflow (Auto-generates JSON workflow)
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
                            className="flex-1 bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-primary/30 transition-all"
                          >
                            Save & Rebuild Workflow
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="flex-1 bg-slate-800 text-slate-400 border border-slate-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-background-dark/30 rounded-lg p-3 text-xs text-slate-400 font-mono max-h-20 overflow-y-auto">
                          {task.prompt.substring(0, 150)}...
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelectTask(task)}
                            disabled={!task.active}
                            className="flex-1 bg-primary hover:bg-primary/90 text-background-dark px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FontAwesomeIcon icon={faPlay as any} />
                            Execute
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg transition-all"
                          >
                            <FontAwesomeIcon icon={faCog as any} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Chat Sidebar */}
      <aside className="w-1/4 h-full bg-background-dark/50 backdrop-blur-sm flex flex-col">
        {/* Chat content... */}
      </aside>

      {/* Workflow Execution Modal */}
      <WorkflowExecutionModal
        isOpen={showWorkflowModal}
        onClose={() => {
          setShowWorkflowModal(false);
          setSelectedTaskForWorkflow(null);
        }}
        task={selectedTaskForWorkflow}
      />
    </div>
  );
}
