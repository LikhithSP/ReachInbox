'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Calendar,
  Clock,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  User,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';

interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: string;
  errorMessage?: string | null;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>({
    name: 'Likhith S P',
    email: 'splikith04@gmail.com',
  });

  // Compose form states
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Hello {{email}},\n\nWelcome to ReachInbox Email Scheduler Demo!\n\nBest regards,\nReachInbox Team');
  const [recipientsText, setRecipientsText] = useState('alice@example.com\nbob@example.com\ncharlie@example.com');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 30000); // 30s in the future
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [scheduling, setScheduling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Recipient stats
  const parseRecipients = () => {
    const lines = recipientsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== 'email');
    const valid = lines.filter((l) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l));
    const unique = Array.from(new Set(valid));
    return {
      total: lines.length,
      valid: valid.length,
      unique: unique.length,
      duplicates: valid.length - unique.length,
      invalid: lines.length - valid.length,
      list: unique,
    };
  };

  const recipientStats = parseRecipients();

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'scheduled' ? 'scheduled' : 'sent';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`http://localhost:4000/api/v1/emails/${endpoint}?limit=50${searchParam}`, {
        headers: {
          'x-dev-user-id': 'usr_demo_likhith',
          'x-dev-user-email': 'splikith04@gmail.com',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setEmails(json.data || []);
      }
    } catch (e) {
      console.warn('Notice fetching emails:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 4000); // Polling for lively scheduler monitoring
    return () => clearInterval(interval);
  }, [activeTab, searchQuery]);

  const handleScheduleCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientStats.list.length === 0) {
      alert('Please provide at least one valid recipient email.');
      return;
    }

    setScheduling(true);
    setStatusMessage(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': 'usr_demo_likhith',
          'x-dev-user-email': 'splikith04@gmail.com',
        },
        body: JSON.stringify({
          subject,
          body,
          startTime: new Date(startTime).toISOString(),
          delayMs: delaySeconds * 1000,
          hourlyLimit: Number(hourlyLimit),
          recipients: recipientStats.list.map((email) => ({ email })),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setStatusMessage(`Successfully scheduled ${result.scheduledCount} emails!`);
        setTimeout(() => {
          setShowComposeModal(false);
          setStatusMessage(null);
          fetchEmails();
        }, 1200);
      } else {
        const err = await res.json();
        alert(`Error scheduling: ${err?.error?.message || 'Failed'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setScheduling(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Simple extraction of emails from csv/txt
        const matches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
          setRecipientsText(matches.join('\n'));
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ReachInbox
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Scheduler
                </span>
              </h1>
              <p className="text-xs text-slate-400">BullMQ Persistent Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
                {user?.name.charAt(0) || 'U'}
              </div>
              <span className="font-medium text-slate-200">{user?.name}</span>
              <span className="text-slate-500 hidden sm:inline">({user?.email})</span>
            </div>

            <a
              href="http://localhost:4000/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Open BullMQ Observability Board"
            >
              <span>Bull Board</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => (window.location.href = '/login')}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              onClick={fetchEmails}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Compose New Email</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Email Recipient</th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th className="py-3.5 px-6">
                    {activeTab === 'scheduled' ? 'Scheduled Time' : 'Sent Time'}
                  </th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No emails found in this view.</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Compose and schedule a new campaign to see queue execution!
                      </p>
                    </td>
                  </tr>
                ) : (
                  emails.map((email) => {
                    const statusColors: Record<string, string> = {
                      SCHEDULED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      QUEUED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      PROCESSING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                      SENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      RATE_LIMITED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                      FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    };

                    const timeDisplay =
                      activeTab === 'scheduled'
                        ? new Date(email.scheduledAt).toLocaleString()
                        : email.sentAt
                        ? new Date(email.sentAt).toLocaleString()
                        : new Date(email.scheduledAt).toLocaleString();

                    return (
                      <tr
                        key={email.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-white">{email.recipient}</td>
                        <td className="py-4 px-6 text-slate-300 max-w-xs truncate">
                          {email.subject}
                        </td>
                        <td className="py-4 px-6 text-slate-400">{timeDisplay}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              statusColors[email.status] || 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-slate-400 text-[11px]">
                          {email.errorMessage?.includes('Preview:') ? (
                            <a
                              href={email.errorMessage.replace('Preview: ', '')}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
                            >
                              <span>View Ethereal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500 truncate block max-w-xs ml-auto">
                              {email.errorMessage || '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Compose Campaign Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowComposeModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                Compose & Schedule Campaign
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure recipients, delayed delivery, and sender limits
              </p>
            </div>

            <form onSubmit={handleScheduleCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome to ReachInbox!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Body (Supports {'{{email}}'} variable)
                </label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Recipients (One per line or upload CSV/TXT)
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  placeholder="alice@example.com&#10;bob@example.com"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Detected: <b>{recipientStats.total}</b></span>
                  <span className="text-emerald-400">Valid: <b>{recipientStats.valid}</b></span>
                  <span className="text-amber-400">Duplicates: <b>{recipientStats.duplicates}</b></span>
                  {recipientStats.invalid > 0 && (
                    <span className="text-rose-400">Invalid: <b>{recipientStats.invalid}</b></span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Delay Between Sends (s)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hourly Limit (per sender)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling || recipientStats.list.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {scheduling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Schedule {recipientStats.list.length} Emails</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
