'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  Send,
  Star,
  ChevronDown,
  LogOut,
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
  AlignRight,
  List,
  ListOrdered,
  Outdent,
  Indent,
  Quote,
  Table,
  Strikethrough,
  ExternalLink,
  Upload,
  X,
  FileText,
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatarUrl?: string | null }>({
    id: 'usr_demo_likhith',
    name: 'Oliver Brown',
    email: 'oliver.brown@domain.io',
    avatarUrl: null,
  });

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    router.push('/login');
  };

  // View state: 'list' | 'compose' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  // Compose form states
  const [recipientTags, setRecipientTags] = useState<string[]>([]);
  const [newRecipientInput, setNewRecipientInput] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('00');
  const [hourlyLimit, setHourlyLimit] = useState('00');
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [textSize, setTextSize] = useState<number>(14);
  const [showTextSizeSlider, setShowTextSizeSlider] = useState<boolean>(false);

  // Active formatting state for highlighting toolbar buttons
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    insertOrderedList: false,
    insertUnorderedList: false,
    isBlockquote: false,
    currentFontSize: 14,
  });

  const updateActiveFormats = () => {
    if (typeof document !== 'undefined') {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikeThrough');
      const isJustifyLeft = document.queryCommandState('justifyLeft');
      const isJustifyCenter = document.queryCommandState('justifyCenter');
      const isJustifyRight = document.queryCommandState('justifyRight');
      const isOrdered = document.queryCommandState('insertOrderedList');
      const isUnordered = document.queryCommandState('insertUnorderedList');

      // Detect font size of selection or parent
      const selection = window.getSelection();
      let currentSize = 14;
      let isQuote = false;
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const computedSize = window.getComputedStyle(el).fontSize;
            if (computedSize) {
              const parsed = parseInt(computedSize, 10);
              if (parsed && !isNaN(parsed)) {
                currentSize = parsed;
              }
            }
            if (el.tagName.toLowerCase() === 'blockquote') {
              isQuote = true;
            }
          }
          node = node.parentNode;
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikeThrough: isStrike,
        justifyLeft: isJustifyLeft,
        justifyCenter: isJustifyCenter,
        justifyRight: isJustifyRight,
        insertOrderedList: isOrdered,
        insertUnorderedList: isUnordered,
        isBlockquote: isQuote,
        currentFontSize: currentSize,
      });
      setTextSize(currentSize);
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Helper to execute rich text editing commands and sync state
  const executeEditorCommand = (command: string, value: string | undefined = undefined) => {
    if (typeof document !== 'undefined') {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      if (editorRef.current) {
        setComposeBody(editorRef.current.innerHTML);
      }
      setTimeout(updateActiveFormats, 10);
    }
  };

  // Set exact pixel font size on selection or editor
  const applyExactFontSize = (newPx: number) => {
    setTextSize(newPx);
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      editorRef.current?.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        // Apply span with inline style to selected range
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontSize', false, '7'); // dummy marker to replace with exact px
        if (editorRef.current) {
          const spans = editorRef.current.querySelectorAll('span[style*="xxx-large"], font[size="7"]');
          spans.forEach((el) => {
            (el as HTMLElement).style.fontSize = `${newPx}px`;
            (el as HTMLElement).style.lineHeight = '140%';
          });
          setComposeBody(editorRef.current.innerHTML);
        }
      } else if (editorRef.current) {
        // If no text is highlighted, apply to the editor's current block
        document.execCommand('styleWithCSS', false, 'true');
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        let block: Node | null = range ? range.startContainer : null;
        while (block && block !== editorRef.current && block.parentNode !== editorRef.current) {
          block = block.parentNode;
        }
        if (block && block !== editorRef.current && block.nodeType === Node.ELEMENT_NODE) {
          (block as HTMLElement).style.fontSize = `${newPx}px`;
        } else if (editorRef.current) {
          editorRef.current.style.fontSize = `${newPx}px`;
        }
        setComposeBody(editorRef.current.innerHTML);
      }
      setTimeout(updateActiveFormats, 10);
    }
  };

  // Toggle blockquote
  const toggleBlockquote = () => {
    if (typeof document !== 'undefined') {
      editorRef.current?.focus();
      if (activeFormats.isBlockquote) {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, '<blockquote>');
      }
      if (editorRef.current) {
        setComposeBody(editorRef.current.innerHTML);
      }
      setTimeout(updateActiveFormats, 10);
    }
  };

  // Helper to insert a clean formatted 2x2 table into the editor
  const insertTable = () => {
    if (typeof document !== 'undefined') {
      editorRef.current?.focus();
      const tableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0; border: 1px solid #E2E8F0;">
          <tbody>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">Header 1</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">Header 2</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">Cell 1</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">Cell 2</td>
            </tr>
          </tbody>
        </table>
        <p><br></p>
      `;
      document.execCommand('insertHTML', false, tableHtml);
      if (editorRef.current) {
        setComposeBody(editorRef.current.innerHTML);
      }
      setTimeout(updateActiveFormats, 10);
    }
  };

  // Attachments state (images, documents, files)
  interface AttachmentItem {
    id: string;
    name: string;
    size: string;
    type: string;
    url: string;
    isImage: boolean;
  }
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  // File upload handler for attachments
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      if (isImg) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: formattedSize,
              type: file.type,
              url: dataUrl,
              isImage: true,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: formattedSize,
            type: file.type,
            url: '',
            isImage: false,
          },
        ]);
      }
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledDateStr, setScheduledDateStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File upload handler for CSV/TXT recipient lists
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches && matches.length > 0) {
          const uniqueNew = Array.from(new Set([...recipientTags, ...matches]));
          setRecipientTags(uniqueNew);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Fetch emails from API and sync exact counts
  const fetchEmails = async () => {
    setLoading(true);
    try {
      const headers = {
        'x-dev-user-id': 'usr_demo_oliver',
        'x-dev-user-email': 'oliver.brown@domain.io',
      };

      const endpoint = activeTab === 'scheduled' ? 'scheduled' : 'sent';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

      // Fetch active tab list AND counts for both tabs simultaneously
      const [listRes, scheduledRes, sentRes] = await Promise.all([
        fetch(`http://localhost:4000/api/v1/emails/${endpoint}?limit=50${searchParam}`, {
          headers,
          credentials: 'include',
        }),
        fetch(`http://localhost:4000/api/v1/emails/scheduled?limit=1`, {
          headers,
          credentials: 'include',
        }),
        fetch(`http://localhost:4000/api/v1/emails/sent?limit=1`, {
          headers,
          credentials: 'include',
        }),
      ]);

      if (listRes.ok) {
        const json = await listRes.json();
        setEmails(json.data || []);
      }

      if (scheduledRes.ok) {
        const schedJson = await scheduledRes.json();
        setScheduledCount(schedJson.pagination?.total ?? 0);
      }

      if (sentRes.ok) {
        const sentJson = await sentRes.json();
        setSentCount(sentJson.pagination?.total ?? 0);
      }
    } catch (err) {
      console.warn('Notice fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch authenticated user profile
    fetch('http://localhost:4000/api/v1/auth/me', {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.email) {
          setCurrentUser(data);
        }
      })
      .catch(() => {});
  }, []);

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

  // Extract clean recipient name from email (e.g. "john.smith@domain.com" -> "John Smith", "olive@domain.com" -> "Olive")
  const formatRecipientName = (emailOrName: string) => {
    if (!emailOrName) return 'Recipient';
    // If it's already a full name
    if (!emailOrName.includes('@')) return emailOrName;
    const prefix = emailOrName.split('@')[0];
    return prefix
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Handle Send or Send Later
  const handleSendOrSchedule = async (isScheduled: boolean) => {
    setSubmitting(true);
    try {
      const allEmails = [...recipientTags];
      if (newRecipientInput.trim() && !allEmails.includes(newRecipientInput.trim())) {
        allEmails.push(newRecipientInput.trim());
      }

      const recipients = allEmails
        .filter((r) => r.length > 0)
        .map((email) => ({ email }));

      const effectiveStartTime = isScheduled && scheduledDateStr
        ? new Date(scheduledDateStr).toISOString()
        : new Date(Date.now() + 5000).toISOString();

      const delayMs = parseInt(delaySeconds, 10) ? parseInt(delaySeconds, 10) * 1000 : 2000;
      const limit = parseInt(hourlyLimit, 10) ? parseInt(hourlyLimit, 10) : 100;

      const res = await fetch('http://localhost:4000/api/v1/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-user-id': currentUser.id,
          'x-dev-user-email': currentUser.email,
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
        setScheduledDateStr('');
        setComposeBody('');
        setAttachments([]);
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
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
      {/* 1. Left Sidebar Navigation (Matching Figma Exactly: width 260px, height 900px, border-r 1px, pt 20px, pr 16px, pb 8px, pl 8px) */}
      <aside
        style={{
          width: '260px',
          minHeight: '900px',
          borderRight: '1px solid #EEF2F0',
          paddingTop: '20px',
          paddingRight: '16px',
          paddingBottom: '8px',
          paddingLeft: '8px',
          opacity: 1,
        }}
        className="flex flex-col shrink-0 bg-white"
      >
        {/* Logo "ONB" container (width: 236, height: 39, pr: 12px, pb: 10px, pl: 12px, justify-between) */}
        <div
          style={{
            width: '236px',
            height: '39px',
            paddingRight: '12px',
            paddingBottom: '10px',
            paddingLeft: '12px',
            opacity: 1,
          }}
          className="flex items-center justify-between mb-4 self-center"
        >
          <svg
            width="104"
            height="34"
            viewBox="0 0 29 12"
            fill="black"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
          >
            {/* --- Letter 'O' (thick 2-unit stroke, rows 0..11, cols 0..7) --- */}
            {/* Top horizontal bar */}
            <rect x="2" y="0" width="4" height="2" />
            {/* Left vertical bar */}
            <rect x="0" y="2" width="2" height="8" />
            {/* Right vertical bar */}
            <rect x="6" y="2" width="2" height="8" />
            {/* Bottom horizontal bar */}
            <rect x="2" y="10" width="4" height="2" />

            {/* --- Letter 'N' (thick solid stems & diagonal, cols 10..18) --- */}
            {/* Left stem */}
            <rect x="10" y="0" width="2" height="12" />
            {/* Diagonal step 1 */}
            <rect x="12" y="2" width="2" height="4" />
            {/* Diagonal step 2 */}
            <rect x="14" y="5" width="2" height="4" />
            {/* Right stem */}
            <rect x="16" y="0" width="2" height="12" />

            {/* --- Letter 'B' (thick solid spine & dual loops, cols 20..28) --- */}
            {/* Left spine */}
            <rect x="20" y="0" width="2" height="12" />
            {/* Top horizontal */}
            <rect x="22" y="0" width="4" height="2" />
            {/* Top loop right */}
            <rect x="26" y="2" width="2" height="3" />
            {/* Middle cross bar */}
            <rect x="22" y="5" width="4" height="2" />
            {/* Bottom loop right */}
            <rect x="26" y="7" width="2" height="3" />
            {/* Bottom horizontal */}
            <rect x="22" y="10" width="4" height="2" />
          </svg>
        </div>

        {/* User profile dropdown pill with Logout option */}
        <div className="relative self-center mb-4">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '236px',
              height: '56px',
              borderRadius: '16px',
              borderBottom: '1px solid #EEF2F0',
              paddingTop: '10px',
              paddingRight: '12px',
              paddingBottom: '10px',
              paddingLeft: '12px',
              opacity: 1,
            }}
            className="flex items-center justify-between bg-[#F5F7F6] cursor-pointer hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00A843] to-emerald-400 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                  {currentUser.name
                    ? currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: '100%',
                    letterSpacing: '-0.15px',
                  }}
                  className="text-slate-900 truncate mb-1"
                >
                  {currentUser.name || 'Oliver Brown'}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '100%',
                    letterSpacing: '-0.15px',
                  }}
                  className="text-slate-400 truncate"
                >
                  {currentUser.email || 'oliver.brown@domain.io'}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </div>

          {/* User Dropdown Menu with Logout */}
          {showUserMenu && (
            <div
              style={{
                fontFamily: "var(--font-inter), 'Inter', sans-serif",
                letterSpacing: '-0.15px',
              }}
              className="absolute left-0 top-[60px] w-[236px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-100 p-2 z-30 space-y-1 animate-in fade-in slide-in-from-top-1"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Button with exact Figma properties */}
        <button
          onClick={() => {
            setViewMode('compose');
            setSelectedEmail(null);
            setRecipientTags([]);
            setNewRecipientInput('');
            setComposeSubject('');
            setComposeBody('');
            if (editorRef.current) {
              editorRef.current.innerHTML = '';
            }
            setScheduledDateStr('');
            setShowSendLater(false);
            setAttachments([]);
          }}
          style={{
            width: '236px',
            height: '34px',
            borderRadius: '16777200px',
            border: '1px solid #00A63E',
            paddingTop: '7px',
            paddingRight: '68px',
            paddingBottom: '7px',
            paddingLeft: '68px',
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontWeight: 500,
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '-0.15px',
            textAlign: 'center',
            color: '#00A63E',
            opacity: 1,
          }}
          className="mb-2 hover:bg-[#E8F5E9]/50 transition flex items-center justify-center cursor-pointer shrink-0 self-center"
        >
          <span style={{ width: '63px', height: '20px', display: 'inline-block' }}>
            Compose
          </span>
        </button>

        {/* Nav Section: CORE (width: 236, height: 723) */}
        <div
          style={{
            width: '236px',
            height: '723px',
            opacity: 1,
          }}
          className="flex flex-col space-y-1 self-center"
        >
          {/* CORE Text Header (moved up: padding-top: 8px) */}
          <div
            style={{
              width: '236px',
              height: '24px',
              paddingTop: '6px',
              paddingRight: '16px',
              paddingBottom: '2px',
              paddingLeft: '16px',
              opacity: 1,
            }}
            className="flex items-center"
          >
            <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase leading-none">
              CORE
            </p>
          </div>

          {/* Scheduled Nav Item */}
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setViewMode('list');
              setSelectedEmail(null);
            }}
            style={{
              width: '236px',
              height: '36px',
              borderRadius: '12px',
              paddingRight: '16px',
              paddingLeft: '16px',
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '14px',
              lineHeight: '100%',
              letterSpacing: '-0.15px',
              opacity: 1,
            }}
            className={`flex items-center justify-between transition ${
              activeTab === 'scheduled' && viewMode === 'list'
                ? 'bg-[#E5F5EB] text-slate-950 font-bold'
                : 'text-slate-600 hover:bg-slate-50 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-800 stroke-[2]" />
              <span className={activeTab === 'scheduled' && viewMode === 'list' ? 'font-bold text-slate-950' : 'font-normal'}>
                Scheduled
              </span>
            </div>
            <span className={`text-[12px] ${activeTab === 'scheduled' && viewMode === 'list' ? 'text-slate-800 font-semibold' : 'text-slate-500 font-normal'}`}>
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
            style={{
              width: '236px',
              height: '36px',
              borderRadius: '12px',
              paddingRight: '16px',
              paddingLeft: '16px',
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '14px',
              lineHeight: '100%',
              letterSpacing: '-0.15px',
              opacity: 1,
            }}
            className={`flex items-center justify-between transition ${
              activeTab === 'sent' && viewMode === 'list'
                ? 'bg-[#E5F5EB] text-slate-950 font-bold'
                : 'text-slate-600 hover:bg-slate-50 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-slate-800 stroke-[2]" />
              <span className={activeTab === 'sent' && viewMode === 'list' ? 'font-bold text-slate-950' : 'font-normal'}>
                Sent
              </span>
            </div>
            <span className={`text-[12px] ${activeTab === 'sent' && viewMode === 'list' ? 'text-slate-800 font-semibold' : 'text-slate-500 font-normal'}`}>
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
            {/* Top Bar (Matching Figma: height 58px, justify-between, pt 12px, px 16px) */}
            <div
              style={{
                height: '58px',
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingRight: '16px',
                paddingLeft: '16px',
                opacity: 1,
              }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1 max-w-[680px]">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2 stroke-[1.75]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '-0.15px',
                    }}
                    className="w-full h-9 pl-11 pr-5 bg-[#F4F6F5] text-slate-800 placeholder-[#9CA3AF] rounded-full focus:outline-none focus:ring-1 focus:ring-[#00A843] border-none"
                  />
                </div>

                {/* Filter and Refresh buttons right next to the search box */}
                <div className="flex items-center gap-3 text-[#9CA3AF] shrink-0">
                  <button
                    className="p-1 hover:text-slate-600 transition"
                    title="Filter"
                  >
                    <Filter className="w-4 h-4 stroke-[1.5]" />
                  </button>
                  <button
                    onClick={fetchEmails}
                    className="p-1 hover:text-slate-600 transition"
                    title="Refresh"
                  >
                    {/* Clockwise circular reload icon matching Figma */}
                    <svg
                      className={`w-4 h-4 text-[#9CA3AF] hover:text-slate-600 transition ${loading ? 'animate-spin' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      <polyline points="21 3 21 8 16 8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Email Rows List (Matching Figma: height 842px, pt 16px, px 16px) */}
            <div
              style={{
                minHeight: '842px',
                paddingTop: '16px',
                paddingRight: '16px',
                paddingLeft: '16px',
                opacity: 1,
              }}
              className="flex-1 overflow-y-auto space-y-1"
            >
              {loading ? (
                <div className="space-y-3 px-6 py-4">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-8 py-4 bg-white/70 rounded-xl border border-slate-100 animate-pulse"
                    >
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-36 h-4 bg-slate-200/70 rounded-md" />
                        <div className="w-28 h-6 bg-slate-200/50 rounded-full" />
                        <div className="w-64 h-4 bg-slate-200/60 rounded-md" />
                      </div>
                      <div className="w-4 h-4 bg-slate-200/70 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E5F5EB] flex items-center justify-center text-[#00A843] mb-1 shadow-sm">
                    {activeTab === 'scheduled' ? (
                      <Clock className="w-6 h-6 stroke-[1.75]" />
                    ) : (
                      <Send className="w-6 h-6 stroke-[1.75]" />
                    )}
                  </div>
                  <h4
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '15px',
                      letterSpacing: '-0.15px',
                    }}
                    className="font-semibold text-slate-800"
                  >
                    No {activeTab} emails
                  </h4>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '13px',
                      letterSpacing: '-0.15px',
                    }}
                    className="text-slate-400 max-w-xs leading-relaxed"
                  >
                    {activeTab === 'scheduled'
                      ? 'No queued messages waiting to be dispatched. Hit Compose to schedule a new campaign.'
                      : 'No sent email delivery records recorded yet.'}
                  </p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      setViewMode('detail');
                    }}
                    className="flex items-center justify-between px-10 py-4 hover:bg-[#F9FBFA] transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-8 min-w-0 flex-1">
                      {/* Recipient Name formatted (e.g. "To: John Smith" or "To: Olive") */}
                      <span
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '-0.15px',
                        }}
                        className="font-semibold text-slate-900 w-44 shrink-0 truncate"
                      >
                        To: {formatRecipientName(email.recipient)}
                      </span>

                      {/* Pill Badge matching Figma: Clock icon + Tue 9:15:12 AM */}
                      {activeTab === 'scheduled' ? (
                        <div
                          style={{
                            fontFamily: "var(--font-inter), 'Inter', sans-serif",
                            fontSize: '12px',
                            letterSpacing: '-0.15px',
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4E8] text-[#E06D1C] border border-[#FFD9B3] font-medium shrink-0"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#E06D1C] stroke-[1.75]" />
                          <span>{formatBadgeTime(email.scheduledAt)}</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontFamily: "var(--font-inter), 'Inter', sans-serif",
                            fontSize: '12px',
                            letterSpacing: '-0.15px',
                          }}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-[#F0F2F1] text-slate-600 font-medium shrink-0"
                        >
                          <span>Sent</span>
                        </div>
                      )}

                      {/* Subject and Body snippet */}
                      <div
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '-0.15px',
                        }}
                        className="text-slate-800 truncate flex-1 flex items-center gap-2"
                      >
                        <span className="font-semibold text-slate-900 shrink-0">
                          {email.subject}
                        </span>
                        <span className="text-slate-400 shrink-0">-</span>
                        <span className="text-slate-400 font-normal truncate">
                          {email.body || 'Hi John, just wanted to follow up on our meeting...'}
                        </span>
                      </div>
                    </div>

                    {/* Star icon at far right */}
                    <div className="pl-6 pr-6">
                      <Star className="w-4 h-4 text-slate-300 hover:text-amber-400 stroke-[1.5] transition" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Email Details View (Screen 4 in Figma) */}
        {viewMode === 'detail' && selectedEmail && (
          <div
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              letterSpacing: '-0.15px',
            }}
            className="flex-1 flex flex-col bg-white"
          >
            {/* Detail Top Header */}
            <div className="px-10 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1 hover:text-slate-900 text-slate-700 transition"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '17px',
                    letterSpacing: '-0.15px',
                  }}
                  className="font-bold text-slate-900"
                >
                  {selectedEmail.subject}
                </h2>
              </div>

              <div className="flex items-center gap-4 text-slate-400">
                <Star className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                <Archive className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                <Trash2 className="w-4 h-4 hover:text-slate-600 cursor-pointer" />
                {currentUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ml-2 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00A843] to-emerald-400 text-white flex items-center justify-center font-bold text-[11px] ml-2 shrink-0">
                    {currentUser.name
                      ? currentUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Email Message Content */}
            <div className="flex-1 p-8 max-w-4xl overflow-y-auto space-y-6">
              {/* Sender & Recipient info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00A843] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {selectedEmail.recipient ? selectedEmail.recipient.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), 'Inter', sans-serif",
                        fontSize: '14px',
                        letterSpacing: '-0.15px',
                      }}
                      className="font-semibold text-slate-900"
                    >
                      To: {selectedEmail.recipient}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), 'Inter', sans-serif",
                        fontSize: '12px',
                        letterSpacing: '-0.15px',
                      }}
                      className="text-slate-500 mt-0.5"
                    >
                      From: {selectedEmail.sender?.email || 'oliver.brown@domain.io'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '13px',
                      letterSpacing: '-0.15px',
                    }}
                    className="text-slate-400 font-medium block"
                  >
                    {(() => {
                      const raw = selectedEmail.sentAt || selectedEmail.scheduledAt;
                      try {
                        const d = new Date(raw);
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = months[d.getMonth()];
                        const date = d.getDate();
                        const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        return `${month} ${date}, ${time}`;
                      } catch {
                        return new Date(raw).toLocaleString();
                      }
                    })()}
                  </span>
                </div>
              </div>

              {/* Message text */}
              <div
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                  lineHeight: '160%',
                }}
                className="text-slate-800 pt-2 space-y-4"
              >
                <div
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '160%',
                  }}
                  className="whitespace-pre-wrap text-slate-700 bg-[#F9FBFA] p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.body || 'No message content.',
                  }}
                />

                {selectedEmail.errorMessage?.includes('Preview:') && (
                  <div className="pt-2">
                    <a
                      href={selectedEmail.errorMessage.replace('Preview: ', '')}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontFamily: "var(--font-inter), 'Inter', sans-serif",
                        fontSize: '13px',
                        letterSpacing: '-0.15px',
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-[#00A843] font-semibold border border-emerald-100 hover:bg-emerald-100/70 transition"
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
          <div
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              letterSpacing: '-0.15px',
            }}
            className="flex-1 flex flex-col relative bg-white"
          >
            {/* Header: Compose New Email + Action icons + Green "Send Later" button */}
            <div className="px-10 pt-7 pb-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1 hover:text-slate-900 text-slate-700 transition"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '17px',
                    letterSpacing: '-0.15px',
                  }}
                  className="font-bold text-slate-900"
                >
                  Compose New Email
                </h2>
              </div>

              <div className="flex items-center gap-4">
                {/* Attachment button with dynamic count badge matching Figma reference */}
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className={`relative p-1 transition ${
                      attachments.length > 0 ? 'text-[#00A843]' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Attach images or files"
                  >
                    <Paperclip className={`w-[18px] h-[18px] ${attachments.length > 0 ? 'text-[#00A843] stroke-[2.2]' : 'stroke-[1.75]'}`} />

                    {/* Circular Attachment Count Badge matching screenshot */}
                    {attachments.length > 0 && (
                      <span
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          letterSpacing: '-0.15px',
                        }}
                        className="absolute -bottom-1 -right-1.5 w-4 h-4 rounded-full bg-[#F4F5F6] text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-sm border border-slate-200/50"
                      >
                        {attachments.length}
                      </span>
                    )}
                  </button>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </div>

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

                {/* Send Button: Green Pill border (Defaults to "Send", changes to "Send Later" when scheduled time picked) */}
                <button
                  onClick={() => handleSendOrSchedule(Boolean(scheduledDateStr))}
                  disabled={submitting}
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="px-5 py-2 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E8F5E9]/50 font-medium transition"
                >
                  {submitting
                    ? scheduledDateStr
                      ? 'Scheduling...'
                      : 'Sending...'
                    : scheduledDateStr
                    ? 'Send Later'
                    : 'Send'}
                </button>
              </div>
            </div>

            {/* Compose Form Fields */}
            <div
              style={{
                fontFamily: "var(--font-inter), 'Inter', sans-serif",
                letterSpacing: '-0.15px',
              }}
              className="px-10 py-4 max-w-4xl space-y-4"
            >
              {/* From */}
              <div className="flex items-center gap-6">
                <label
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="text-slate-500 w-12 font-medium"
                >
                  From
                </label>
                <div
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F7F6] font-medium text-slate-800"
                >
                  <span>oliver.brown@domain.io</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* To matching Figma: Pill tags + +N badge + Upload List button */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-4">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <label
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '14px',
                      letterSpacing: '-0.15px',
                      lineHeight: '100%',
                    }}
                    className="text-slate-500 w-12 font-medium shrink-0"
                  >
                    To
                  </label>
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    {recipientTags.slice(0, 3).map((email, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '-0.15px',
                          lineHeight: '100%',
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9] group"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => setRecipientTags(recipientTags.filter((_, i) => i !== idx))}
                          className="text-[#1B5E20]/60 hover:text-[#1B5E20] text-[12px] font-bold leading-none p-0.5"
                          title="Remove email"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {recipientTags.length > 3 && (
                      <button
                        type="button"
                        onClick={() => alert(`Recipients (${recipientTags.length}):\n\n` + recipientTags.join('\n'))}
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '14px',
                          letterSpacing: '-0.15px',
                          lineHeight: '100%',
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold text-[#1B5E20] border border-[#C8E6C9] bg-[#E8F5E9] hover:bg-[#C8E6C9] transition cursor-pointer"
                        title="Click to view all recipients"
                      >
                        +{recipientTags.length - 3}
                      </button>
                    )}

                    <input
                      type="text"
                      placeholder="Add email..."
                      value={newRecipientInput}
                      onChange={(e) => setNewRecipientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRecipientInput.trim()) {
                          e.preventDefault();
                          const val = newRecipientInput.trim();
                          if (!recipientTags.includes(val)) {
                            setRecipientTags([...recipientTags, val]);
                          }
                          setNewRecipientInput('');
                        }
                      }}
                      style={{
                        fontFamily: "var(--font-inter), 'Inter', sans-serif",
                        fontSize: '14px',
                        letterSpacing: '-0.15px',
                        lineHeight: '100%',
                      }}
                      className="text-slate-800 placeholder-slate-400 focus:outline-none min-w-[100px] flex-1 bg-transparent"
                    />
                  </div>
                </div>

                {/* Upload List CTA button matching Figma */}
                <label
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-[#00A843] hover:text-[#008f39] font-medium shrink-0 px-2 py-1 rounded-lg hover:bg-emerald-50 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-[#00A843]" />
                  <span>Upload List</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Subject */}
              <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
                <label
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="text-slate-500 w-12 font-medium"
                >
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '100%',
                  }}
                  className="flex-1 text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Delay & Hourly Limit Inputs */}
              <div
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                  lineHeight: '100%',
                }}
                className="flex items-center gap-8 py-1 text-slate-600"
              >
                <div className="flex items-center gap-3">
                  <span>Delay between 2 emails</span>
                  <input
                    type="text"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(e.target.value)}
                    placeholder="00"
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '14px',
                      letterSpacing: '-0.15px',
                      lineHeight: '100%',
                    }}
                    className="w-16 h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#00A843]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span>Hourly Limit</span>
                  <input
                    type="text"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(e.target.value)}
                    placeholder="00"
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '14px',
                      letterSpacing: '-0.15px',
                      lineHeight: '100%',
                    }}
                    className="w-16 h-8 px-2.5 text-center bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#00A843]"
                  />
                </div>
              </div>

              {/* Rich Text Editor Body - dynamically expands with typing so toolbar hugs the text */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const html = e.currentTarget.innerHTML;
                  setComposeBody(html);
                }}
                data-placeholder="Type Your Reply..."
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                  lineHeight: '160%',
                  minHeight: '64px',
                }}
                className="rich-editor w-full px-4 py-3 bg-[#F8FAF9] text-slate-800 rounded-2xl border border-slate-200/70 focus:outline-none focus:ring-1 focus:ring-[#00A843]/40 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none transition-[height,border-color] duration-75"
              />

              {/* Rich text formatting toolbar matching Figma Screen 5 with rounded corners and white background */}
              <div
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  letterSpacing: '-0.15px',
                }}
                className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-2 flex items-center gap-1.5 text-slate-500 text-xs overflow-x-auto select-none"
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('undo');
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('redo');
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition"
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                {/* Text Size Slider Button & Popover */}
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowTextSizeSlider(!showTextSizeSlider)}
                    className={`p-1.5 rounded-md transition font-medium flex items-center gap-1 ${
                      showTextSizeSlider || textSize !== 14
                        ? 'bg-[#E5F5EB] text-[#00A843] font-bold ring-1 ring-[#00A843]/30'
                        : 'hover:text-slate-900 hover:bg-slate-200/60 text-slate-600'
                    }`}
                    title="Change font size (slider)"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{textSize}px</span>
                  </button>

                  {/* Font Size Slider Popover */}
                  {showTextSizeSlider && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute bottom-9 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3 w-56 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">Font Size</span>
                        <span className="text-xs font-bold text-[#00A843] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {textSize}px
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">10</span>
                        <input
                          type="range"
                          min="10"
                          max="36"
                          step="1"
                          value={textSize}
                          onChange={(e) => applyExactFontSize(parseInt(e.target.value, 10))}
                          className="w-full accent-[#00A843] cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">36</span>
                      </div>

                      {/* Quick preset pills */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                        {[12, 14, 16, 20, 24].map((px) => (
                          <button
                            key={px}
                            type="button"
                            onClick={() => applyExactFontSize(px)}
                            className={`px-2 py-0.5 text-[10px] rounded-md transition ${
                              textSize === px
                                ? 'bg-[#00A843] text-white font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {px}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('bold');
                  }}
                  className={`p-1.5 rounded-md transition font-bold ${
                    activeFormats.bold
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('italic');
                  }}
                  className={`p-1.5 rounded-md transition italic ${
                    activeFormats.italic
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('underline');
                  }}
                  className={`p-1.5 rounded-md transition underline ${
                    activeFormats.underline
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('justifyLeft');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.justifyLeft
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('justifyCenter');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.justifyCenter
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('justifyRight');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.justifyRight
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('insertOrderedList');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.insertOrderedList
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('insertUnorderedList');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.insertUnorderedList
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('outdent');
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition"
                  title="Outdent"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('indent');
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition"
                  title="Indent"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleBlockquote();
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.isBlockquote
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertTable();
                  }}
                  className="p-1.5 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition"
                  title="Insert 2x2 Table"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeEditorCommand('strikeThrough');
                  }}
                  className={`p-1.5 rounded-md transition ${
                    activeFormats.strikeThrough
                      ? 'bg-[#E5F5EB] text-[#00A843] ring-1 ring-[#00A843]/30'
                      : 'hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Attachment Previews Positioned Directly Below Text Editor Toolbar */}
              {attachments.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Attachments ({attachments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments([])}
                      className="text-[11px] text-slate-400 hover:text-red-500 transition"
                    >
                      Remove all
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          letterSpacing: '-0.15px',
                        }}
                        className="group relative w-56 bg-[#F8FAF9] rounded-2xl overflow-hidden border border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col hover:shadow-md transition"
                      >
                        {/* Remove attachment pill button */}
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/40 hover:bg-red-500 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* Image / File Preview Header */}
                        {att.isImage ? (
                          <div className="w-full h-32 bg-slate-100 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-emerald-50/70 text-[#00A843] flex flex-col items-center justify-center gap-1.5 border-b border-emerald-100/50">
                            <FileText className="w-9 h-9 stroke-[1.5]" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80">
                              {att.name.split('.').pop() || 'FILE'}
                            </span>
                          </div>
                        )}

                        {/* Card Details: Exact Match to Figma Reference */}
                        <div className="p-3.5 flex flex-col justify-center">
                          <p
                            style={{
                              fontSize: '15px',
                              letterSpacing: '-0.2px',
                            }}
                            className="font-semibold text-[#1E293B] truncate leading-tight"
                            title={att.name}
                          >
                            {att.name}
                          </p>
                          <p
                            style={{
                              fontSize: '13px',
                              letterSpacing: '-0.15px',
                            }}
                            className="text-[#64748B] font-normal mt-1 leading-none"
                          >
                            {att.size}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Later Popover Modal (Matching Figma Screen 5 top right) */}
            {showSendLater && (
              <div
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  letterSpacing: '-0.15px',
                }}
                className="absolute top-16 right-8 w-72 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-5 space-y-4 z-20"
              >
                <h3
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                  }}
                  className="font-bold text-slate-900"
                >
                  Send Later
                </h3>

                <div className="relative">
                  <div
                    onClick={() => {
                      const input = document.getElementById('scheduled-datetime-input') as HTMLInputElement | null;
                      if (input) {
                        if (typeof input.showPicker === 'function') {
                          input.showPicker();
                        } else {
                          input.focus();
                        }
                      }
                    }}
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '13px',
                      letterSpacing: '-0.15px',
                    }}
                    className="w-full h-9 px-3 bg-[#F5F7F6] text-slate-800 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition"
                  >
                    <span className={scheduledDateStr ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      {scheduledDateStr ? new Date(scheduledDateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pick date & time'}
                    </span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="scheduled-datetime-input"
                    type="datetime-local"
                    value={scheduledDateStr}
                    onChange={(e) => setScheduledDateStr(e.target.value)}
                    className="sr-only"
                  />
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                  }}
                  className="space-y-2 text-slate-600"
                >
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
                    onClick={() => {
                      setScheduledDateStr('');
                      setShowSendLater(false);
                    }}
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '13px',
                      letterSpacing: '-0.15px',
                    }}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSendLater(false)}
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontSize: '14px',
                      letterSpacing: '-0.15px',
                    }}
                    className="px-4 py-1.5 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E8F5E9]/50 font-semibold transition"
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
