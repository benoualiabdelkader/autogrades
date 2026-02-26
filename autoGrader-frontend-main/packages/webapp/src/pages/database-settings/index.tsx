"use client";

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faCheck, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Sidebar from '@/components/Sidebar';

export default function DatabaseSettings() {
  const [config, setConfig] = useState({
    dbhost: '127.0.0.1',
    dbport: '3307',
    dbname: 'moodle',
    dbuser: 'root',
    dbpass: '',
    prefix: 'mdl_'
  });

  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      [e.target.name]: e.target.value
    });
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionStatus('idle');
    setStatusMessage('');

    try {
      const response = await fetch('/api/moodle/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('success');
        setStatusMessage(`Connected successfully! Found ${data.stats?.totalUsers || 0} users in database.`);
        
        // Save to localStorage
        localStorage.setItem('moodleConfig', JSON.stringify(config));
      } else {
        setConnectionStatus('error');
        setStatusMessage(data.message || 'Connection failed');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setStatusMessage(error.message || 'Failed to connect to database');
    } finally {
      setTesting(false);
    }
  };

  const loadSavedConfig = () => {
    const saved = localStorage.getItem('moodleConfig');
    if (saved) {
      setConfig(JSON.parse(saved));
      setStatusMessage('Loaded saved configuration');
    }
  };

  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <FontAwesomeIcon icon={faDatabase} className="text-primary" />
              Database Configuration
            </h1>
            <p className="text-slate-400 mt-2">
              Configure connection to Moodle MariaDB database
            </p>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <div className={`glass-panel p-4 rounded-xl mb-6 border-l-4 ${
              connectionStatus === 'success' 
                ? 'border-l-primary bg-primary/5' 
                : 'border-l-red-500 bg-red-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon 
                  icon={connectionStatus === 'success' ? faCheck : faXmark} 
                  className={connectionStatus === 'success' ? 'text-primary' : 'text-red-400'}
                />
                <p className={connectionStatus === 'success' ? 'text-primary' : 'text-red-400'}>
                  {statusMessage}
                </p>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="glass-panel p-8 rounded-xl">
            <h2 className="text-xl font-semibold text-slate-100 mb-6">
              Moodle Database Settings
            </h2>

            <div className="space-y-6">
              {/* Database Host */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 font-semibold mb-2 block">
                    Database Host
                  </label>
                  <input
                    type="text"
                    name="dbhost"
                    value={config.dbhost}
                    onChange={handleChange}
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="127.0.0.1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 font-semibold mb-2 block">
                    Port
                  </label>
                  <input
                    type="text"
                    name="dbport"
                    value={config.dbport}
                    onChange={handleChange}
                    className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="3307"
                  />
                </div>
              </div>

              {/* Database Name */}
              <div>
                <label className="text-sm text-slate-400 font-semibold mb-2 block">
                  Database Name
                </label>
                <input
                  type="text"
                  name="dbname"
                  value={config.dbname}
                  onChange={handleChange}
                  className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="moodle"
                />
              </div>

              {/* Database User */}
              <div>
                <label className="text-sm text-slate-400 font-semibold mb-2 block">
                  Database User
                </label>
                <input
                  type="text"
                  name="dbuser"
                  value={config.dbuser}
                  onChange={handleChange}
                  className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="root"
                />
              </div>

              {/* Database Password */}
              <div>
                <label className="text-sm text-slate-400 font-semibold mb-2 block">
                  Database Password
                </label>
                <input
                  type="password"
                  name="dbpass"
                  value={config.dbpass}
                  onChange={handleChange}
                  className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Leave empty if no password"
                />
              </div>

              {/* Table Prefix */}
              <div>
                <label className="text-sm text-slate-400 font-semibold mb-2 block">
                  Table Prefix
                </label>
                <input
                  type="text"
                  name="prefix"
                  value={config.prefix}
                  onChange={handleChange}
                  className="w-full bg-background-dark/50 border border-primary/20 rounded-lg px-4 py-3 text-slate-200 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="mdl_"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Default Moodle prefix is &quot;mdl_&quot;. Use different prefix for AutoGrader tables (e.g., &quot;ag_&quot;)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="flex-1 bg-primary hover:bg-primary/90 text-background-dark px-6 py-3 rounded-lg font-semibold transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faDatabase} />
                      Test Connection
                    </>
                  )}
                </button>
                <button
                  onClick={loadSavedConfig}
                  className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  Load Saved
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Examples */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Option 1: Same Database
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Use same Moodle database with different prefix
              </p>
              <div className="bg-background-dark/50 p-4 rounded-lg border border-primary/10">
                <code className="text-xs text-primary">
                  dbname: moodle<br/>
                  prefix: ag_
                </code>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Option 2: New Database
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Create separate database for AutoGrader
              </p>
              <div className="bg-background-dark/50 p-4 rounded-lg border border-primary/10">
                <code className="text-xs text-primary">
                  dbname: autograder_db<br/>
                  prefix: ag_
                </code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
