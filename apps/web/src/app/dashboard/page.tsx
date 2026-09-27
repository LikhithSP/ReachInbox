'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  Send,
  Star,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Paperclip,
  Trash2,
  Archive,
  MoreVertical,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  List,
  ListOrdered,
  Outdent,
  Indent,
  Quote,
  Table,
  Strikethrough,
  ExternalLink,
} from 'lucide-react';

interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: string;
  errorMessage?: string | null;
  sender?: {
    email: string;
  };
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(12);
  const [sentCount, setSentCount] = useState(785);

  // View state: 'list' | 'compose' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  // Compose form states
  const [composeTo, setComposeTo] = useState('recipient@example.com');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('00');
  const [hourlyLimit, setHourlyLimit] = useState('00');

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledDateStr, setScheduledDateStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch emails from API
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'scheduled' ? 'scheduled' : 'sent';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`http://localhost:4000/api/v1/emails/${endpoint}?limit=50${searchParam}`, {
        headers: {
          'x-dev-user-id': 'usr_demo_oliver',
          'x-dev-user-email': 'oliver.brown@domain.io',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setEmails(data);
        if (activeTab === 'scheduled') {
          setScheduledCount(json.pagination?.total || data.length);
        } else {
          setSentCount(json.pagination?.total || data.length);
        }
      }
    } catch {
      // Fallback local sample data matching Figma if API is not yet seeded
      if (activeTab === 'scheduled') {
        setEmails([
          {
            id: 'demo-1',
            recipient: 'John Smith',
            subject: 'Meeting follow-up - Scheduled',
            body: 'Hi John, just wanted to follow up on our meeting yesterday and confirm the project timeline...',
            scheduledAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            status: 'SCHEDULED',
          },
          {
            id: 'demo-2',
            recipient: 'Olive',
            subject: "Ramit, great to meet you - you'll love it",
            body: 'Hi Olive, just wanted to follow up on our meeting and see if you had any questions on the proposal...',
            scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
            status: 'SCHEDULED',
          },
        ]);
      } else {
        setEmails([
          {
            id: 'demo-3',
            recipient: 'Sarah Wilson',
            subject: 'Re: Project Update',
            body: 'Thanks for the update, Sarah. Looks good! Everything is on track for Thursday.',
            scheduledAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
            status: 'SENT',
          },
          {
            id: 'demo-4',
            recipient: 'Support',
            subject: 'Issue with login',
            body: 'I am having trouble logging in to the dashboard with my credentials. Could you assist?',
            scheduledAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
            status: 'SENT',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [activeTab, searchQuery]);

  // Format timestamp badge like Figma: "Tue 9:15:12 AM" or "Thu 8:15:12 PM"
  const formatBadgeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = days[d.getDay()];
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      return `${day} ${timeStr}`;
    } catch {
      return 'Scheduled';
    }
  };

  // Handle Send or Send Later
  const handleSendOrSchedule = async (isScheduled: boolean) => {
    setSubmitting(true);
    try {
      const recipients = composeTo
        .split(/[\n,]+/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
        .map((email) => ({ email }));

      const effectiveStartTime = isScheduled && scheduledDateStr
        ? new Date(scheduledDateStr).toISOString()
        : new Date(Date.now() + 5000).toISOString();

      const delayMs = parseInt(delaySeconds, 10) ? parseInt(delaySeconds, 10) * 1000 : 2000;
      const limit = parseInt(hourlyLimit, 10) ? parseInt(hourlyLimit, 10) : 100;

      const res = await fetch('http://localhost:4000/api/v1/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': 'usr_demo_oliver',
          'x-dev-user-email': 'oliver.brown@domain.io',
        },
        body: JSON.stringify({
          subject: composeSubject || 'No Subject',
          body: composeBody || 'No Content',
          startTime: effectiveStartTime,
          delayMs,
          hourlyLimit: limit,
          recipients: recipients.length > 0 ? recipients : [{ email: 'recipient@example.com' }],
        }),
      });

      if (res.ok) {
        setShowSendLater(false);
        setViewMode('list');
        await fetchEmails();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}: Failed to schedule campaign`;
        alert(`Error: ${msg}\nMake sure MySQL and Redis are running (or docker compose up -d).`);
        setShowSendLater(false);
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Failed to submit campaign:', err);
      alert(`Network error connecting to API server at http://localhost:4000: ${err.message}.\nCheck that npm run dev:api is running.`);
      setShowSendLater(false);
      setViewMode('list');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex font-sans antialiased">
      {/* 1. Left Sidebar Navigation (Matching Figma) */}
      <aside className="w-[240px] border-r border-slate-100 flex flex-col py-6 px-4 shrink-0 bg-white">
        {/* Logo "ONB" in bold geometric typeface */}
        <div className="px-2 mb-6">
          <span className="text-2xl font-black tracking-tight text-slate-950 font-mono">
            ONB
          </span>
        </div>

        {/* User profile dropdown pill */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#F5F7F6] border border-slate-100 mb-4 cursor-pointer hover:bg-slate-100/80 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=64&h=64"
              alt="Oliver Brown"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
                Oliver Brown
              </p>
              <p className="text-[11px] text-slate-400 leading-tight truncate">
                oliver.brown@domain.io
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {/* Compose Button matching Figma: green border, pill shape */}
        <button
          onClick={() => {
            setViewMode('compose');
            setSelectedEmail(null);
          }}
          className="w-full h-10 mb-8 rounded-full border border-[#00A843] text-[#00A843] font-medium text-xs hover:bg-[#E8F5E9]/50 transition flex items-center justify-center tracking-wide"
        >
          Compose
        </button>

        {/* Nav Section: CORE */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-3 mb-2">
            CORE
          </p>

          {/* Scheduled Nav Item */}
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setViewMode('list');
              setSelectedEmail(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'scheduled' && viewMode === 'list'
                ? 'bg-[#E8F5E9] text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>Scheduled</span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              {scheduledCount}
            </span>
          </button>

          {/* Sent Nav Item */}
          <button
            onClick={() => {
              setActiveTab('sent');
              setViewMode('list');
              setSelectedEmail(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'sent' && viewMode === 'list'
                ? 'bg-[#E8F5E9] text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-slate-700" />
              <span>Sent</span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              {sentCount}
            </span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* VIEW 1: Email Lists (Scheduled or Sent) */}
        {viewMode === 'list' && (
          <div className="flex-1 flex flex-col">
            {/* Top Bar with Search input and action icons */}
            <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100">
              <div className="relative flex-1 max-w-2xl">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-11 pr-4 bg-[#F5F7F6] text-slate-800 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00A843] border border-transparent"
                />
              </div>

              <div className="flex items-center gap-4 text-slate-400 ml-6">
                <button
                  className="p-1 hover:text-slate-600 transition"
                  title="Filter"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={fetchEmails}
                  className="p-1 hover:text-slate-600 transition"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Email Rows List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {emails.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No {activeTab} emails found. Click <b>Compose</b> to schedule!
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      setViewMode('detail');
                    }}
                    className="flex items-center justify-between px-8 py-4 hover:bg-slate-50/70 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-6 min-w-0 flex-1">
                      {/* Recipient */}
                      <span className="text-xs font-semibold text-slate-900 w-32 shrink-0 truncate">
                        To: {email.recipient}
                      </span>

                      {/* Pill Badge */}
                      {activeTab === 'scheduled' ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] text-[11px] font-medium shrink-0">
                          <Clock className="w-3 h-3 text-[#E65100]" />
                          <span>{formatBadgeTime(email.scheduledAt)}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E0E0E0] text-[#424242] text-[11px] font-medium shrink-0">
                          <span>Sent</span>
                        </div>
                      )}

                      {/* Subject and Body snippet */}
                      <div className="text-xs text-slate-800 truncate flex-1 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {email.subject}
                        </span>
                        <span className="text-slate-400">-</span>
                        <span className="text-slate-400 font-normal truncate">
                          {email.body || 'Hi John, just wanted to follow up on our meeting...'}
                        </span>
                      </div>
                    </div>

                    {/* Star icon */}
                    <div className="pl-4">
                      <Star className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Email Details View (Screen 4 in Figma) */}
        {viewMode === 'detail' && selectedEmail && (
          <div className="flex-1 flex flex-col">
            {/* Detail Top Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1 hover:text-slate-900 text-slate-600 transition"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedEmail.subject}
                </h2>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                <Star className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                <Archive className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                <Trash2 className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=64&h=64"
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover ml-2"
                />
              </div>
            </div>

            {/* Email Message Content */}
            <div className="flex-1 p-8 max-w-4xl overflow-y-auto space-y-6">
              {/* Sender & Recipient info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00A843] text-white flex items-center justify-center font-bold text-sm">
                    {selectedEmail.recipient ? selectedEmail.recipient.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      To: {selectedEmail.recipient}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      From: {selectedEmail.sender?.email || 'oliver.brown@domain.io'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium block">
                    {selectedEmail.sentAt
                      ? new Date(selectedEmail.sentAt).toLocaleString()
                      : new Date(selectedEmail.scheduledAt).toLocaleString()}
                  </span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedEmail.status}
                  </span>
                </div>
              </div>

              {/* Message text */}
              <div className="text-xs text-slate-800 leading-relaxed pt-2 space-y-4">
                <div className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-[#F9FBFA] p-5 rounded-xl border border-slate-100">
                  {selectedEmail.body || 'No message content.'}
                </div>

                {selectedEmail.errorMessage?.includes('Preview:') && (
                  <div className="pt-2">
                    <a
                      href={selectedEmail.errorMessage.replace('Preview: ', '')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-[#00A843] font-semibold text-xs border border-emerald-100 hover:bg-emerald-100/70 transition"
                    >
                      <span>Open Delivered Email in Ethereal Sandbox</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Compose New Email (Screen 5 in Figma) */}
        {viewMode === 'compose' && (
          <div className="flex-1 flex flex-col relative bg-white">
            {/* Header: Compose New Email + Action icons + Green "Send" button */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1 hover:text-slate-900 text-slate-600 transition"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-900">
                  Compose New Email
                </h2>
              </div>

              <div className="flex items-center gap-4">
                {/* Attachment icon */}
                <button className="text-slate-400 hover:text-slate-600 p-1">
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Clock icon to trigger Send Later Popover */}
                <button
                  onClick={() => setShowSendLater(!showSendLater)}
                  className={`p-1 transition ${
                    showSendLater ? 'text-[#00A843]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Schedule / Send Later"
                >
                  <Clock className="w-4 h-4" />
                </button>

                {/* Send Button: Green Pill border */}
                <button
                  onClick={() => handleSendOrSchedule(false)}
                  disabled={submitting}
                  className="px-6 py-1.5 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E8F5E9]/50 text-xs font-semibold transition"
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Compose Form Fields */}
            <div className="p-8 max-w-4xl space-y-4">
              {/* From */}
              <div className="flex items-center gap-6">
                <label className="text-xs text-slate-500 w-12 font-medium">From</label>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F7F6] text-xs font-medium text-slate-800">
                  <span>oliver.brown@domain.io</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* To */}
              <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
                <label className="text-xs text-slate-500 w-12 font-medium">To</label>
                <input
                  type="text"
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Subject */}
              <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
                <label className="text-xs text-slate-500 w-12 font-medium">Subject</label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Delay & Hourly Limit Inputs */}
              <div className="flex items-center gap-8 py-1 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span>Delay between 2 emails</span>
                  <input
                    type="text"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(e.target.value)}
                    placeholder="00"
                    className="w-16 h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#00A843]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span>Hourly Limit</span>
                  <input
                    type="text"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(e.target.value)}
                    placeholder="00"
                    className="w-16 h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#00A843]"
                  />
                </div>
              </div>

              {/* Rich text formatting toolbar matching Figma Screen 5 */}
              <div className="bg-[#F8FAF9] rounded-xl border border-slate-100 p-2 flex items-center gap-3 text-slate-500 text-xs overflow-x-auto">
                <button type="button" className="p-1 hover:text-slate-800"><Undo2 className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Redo2 className="w-3.5 h-3.5" /></button>
                <span className="w-px h-4 bg-slate-200"></span>
                <button type="button" className="p-1 hover:text-slate-800"><Type className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800 font-bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800 italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800 underline"><Underline className="w-3.5 h-3.5" /></button>
                <span className="w-px h-4 bg-slate-200"></span>
                <button type="button" className="p-1 hover:text-slate-800"><AlignLeft className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><AlignCenter className="w-3.5 h-3.5" /></button>
                <span className="w-px h-4 bg-slate-200"></span>
                <button type="button" className="p-1 hover:text-slate-800"><ListOrdered className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><List className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Outdent className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Indent className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Quote className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Table className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 hover:text-slate-800"><Strikethrough className="w-3.5 h-3.5" /></button>
              </div>

              {/* Text Area Body */}
              <textarea
                rows={12}
                placeholder="Type Your Reply..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full p-4 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>

            {/* Send Later Popover Modal (Matching Figma Screen 5 top right) */}
            {showSendLater && (
              <div className="absolute top-16 right-8 w-72 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-5 space-y-4 z-20">
                <h3 className="text-xs font-bold text-slate-900">Send Later</h3>

                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduledDateStr}
                    onChange={(e) => setScheduledDateStr(e.target.value)}
                    className="w-full h-9 px-3 bg-[#F5F7F6] text-slate-800 text-[11px] rounded-lg border border-slate-200 focus:outline-none focus:border-[#00A843]"
                  />
                </div>

                <div className="space-y-2 text-[11px] text-slate-600">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                      setScheduledDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                    }}
                    className="w-full text-left py-1 hover:text-slate-900 transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(10, 0, 0, 0);
                      setScheduledDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                    }}
                    className="w-full text-left py-1 hover:text-slate-900 transition"
                  >
                    Tomorrow, 10:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(11, 0, 0, 0);
                      setScheduledDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                    }}
                    className="w-full text-left py-1 hover:text-slate-900 transition"
                  >
                    Tomorrow, 11:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(15, 0, 0, 0);
                      setScheduledDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                    }}
                    className="w-full text-left py-1 hover:text-slate-900 transition"
                  >
                    Tomorrow, 3:00 PM
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSendLater(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendOrSchedule(true)}
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E8F5E9]/50 text-xs font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
