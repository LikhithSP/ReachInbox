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
  Pencil,
  Check,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'QUEUED' | 'SENT' | 'FAILED'>('ALL');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
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
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);

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
    if (viewMode === 'compose') {
      document.title = 'ReachInbox - Compose Email';
    } else if (viewMode === 'detail' && selectedEmail) {
      document.title = `ReachInbox - ${selectedEmail.subject || 'Email Details'}`;
    } else if (activeTab === 'scheduled') {
      document.title = 'ReachInbox - Scheduled Emails';
    } else {
      document.title = 'ReachInbox - Sent Emails';
    }
  }, [viewMode, activeTab, selectedEmail]);

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

  // Strip HTML tags and decode common entities to display clean readable text in list snippets
  const stripHtml = (htmlStr?: string) => {
    if (!htmlStr) return '';
    return htmlStr
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
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

      // If images or attachments were added, append them into HTML body
      let finalBodyHtml = composeBody || 'No Content';
      const imageAttachments = attachments.filter((att) => att.isImage && att.url);
      if (imageAttachments.length > 0) {
        const imagesHtml = imageAttachments
          .map(
            (img) =>
              `<div style="margin-top:16px;"><img src="${img.url}" alt="${img.name}" style="max-width:100%; border-radius:8px; border:1px solid #E2E8F0;" /></div>`
          )
          .join('');
        finalBodyHtml = `${finalBodyHtml}${imagesHtml}`;
      }

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
          body: finalBodyHtml,
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
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-800 flex font-sans antialiased">
      {/* 1. Left Sidebar Navigation (Matching Figma Exactly: width 260px, h-screen, border-r 1px, pt 20px, pr 16px, pb 16px, pl 8px) */}
      <aside
        style={{
          width: '260px',
          height: '100vh',
          borderRight: '1px solid #EEF2F0',
          paddingTop: '20px',
          paddingRight: '16px',
          paddingBottom: '16px',
          paddingLeft: '8px',
          opacity: 1,
        }}
        className="flex flex-col justify-between shrink-0 bg-white select-none"
      >
        {/* Logo container: "ReachInbox Email Scheduler" */}
        <div
          style={{
            width: '236px',
            minHeight: '42px',
            paddingRight: '12px',
            paddingBottom: '10px',
            paddingLeft: '12px',
            opacity: 1,
          }}
          className="flex items-center mb-4 self-center"
        >
          <div className="flex items-center gap-3">
            {/* ReachInbox geometric envelope icon matching the crisp mechanical aesthetic */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="black"
              xmlns="http://www.w3.org/2000/svg"
              shapeRendering="crispEdges"
              className="shrink-0"
            >
              {/* Outer top border */}
              <rect x="2" y="4" width="20" height="2" />
              {/* Outer bottom border */}
              <rect x="2" y="18" width="20" height="2" />
              {/* Left border */}
              <rect x="2" y="6" width="2" height="12" />
              {/* Right border */}
              <rect x="20" y="6" width="2" height="12" />
              {/* Envelope flap diagonal pixels */}
              <rect x="4" y="6" width="2" height="2" />
              <rect x="6" y="8" width="2" height="2" />
              <rect x="8" y="10" width="2" height="2" />
              <rect x="10" y="11" width="4" height="2" />
              <rect x="14" y="10" width="2" height="2" />
              <rect x="16" y="8" width="2" height="2" />
              <rect x="18" y="6" width="2" height="2" />
              {/* Green indicator badge pixel */}
              <rect x="11" y="7" width="2" height="2" fill="#00A843" />
            </svg>

            {/* ReachInbox Email Scheduler Typography */}
            <div className="flex flex-col leading-tight">
              <span
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  letterSpacing: '-0.35px',
                }}
                className="text-[17px] font-extrabold text-slate-900 tracking-tight"
              >
                Reach<span className="text-[#00A843]">Inbox</span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  letterSpacing: '0.05em',
                }}
                className="text-[10.5px] font-semibold text-slate-400 uppercase mt-0.5 tracking-wider"
              >
                Email Scheduler
              </span>
            </div>
          </div>
        </div>

        {/* User profile pill */}
        <div
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
          className="flex items-center justify-between bg-[#F5F7F6] mb-4 self-center"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {currentUser.avatarUrl && !imageLoadFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                onError={() => setImageLoadFailed(true)}
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
            paddingRight: '20px',
            paddingBottom: '7px',
            paddingLeft: '20px',
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontWeight: 500,
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '-0.15px',
            textAlign: 'center',
            color: '#00A63E',
            opacity: 1,
          }}
          className="mb-2 hover:bg-[#E8F5E9]/50 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-center"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
          <span style={{ height: '20px', display: 'inline-block' }}>
            Compose
          </span>
        </button>

        {/* Nav Section: CORE */}
        <div
          style={{
            width: '236px',
            opacity: 1,
          }}
          className="flex-1 flex flex-col space-y-1 self-center"
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
              setStatusFilter('ALL');
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
              setStatusFilter('ALL');
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

        {/* Visible Log Out Button at the bottom of sidebar */}
        <div className="mt-auto pt-4 pb-2 self-center">
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '236px',
              height: '38px',
              borderRadius: '12px',
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '14px',
              letterSpacing: '-0.15px',
            }}
            className="flex items-center gap-2.5 px-4 text-slate-600 hover:text-red-600 hover:bg-red-50/70 border border-slate-200/80 transition"
          >
            <LogOut className="w-4 h-4 stroke-[1.75]" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        {/* VIEW 1: Email Lists (Scheduled or Sent) */}
        {viewMode === 'list' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
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
                <div className="flex items-center gap-3 text-[#9CA3AF] shrink-0 relative">
                  {/* Filter Popover Dropdown Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className={`p-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                        statusFilter !== 'ALL' || showFilterMenu
                          ? 'bg-[#E5F5EB] text-[#00A843]'
                          : 'hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Filter emails"
                    >
                      <Filter className="w-4 h-4 stroke-[1.75]" />
                      {statusFilter !== 'ALL' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A843]" />
                      )}
                    </button>

                    {/* Filter Menu dropdown */}
                    {showFilterMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowFilterMenu(false)}
                        />
                        <div
                          style={{
                            fontFamily: "var(--font-inter), 'Inter', sans-serif",
                            letterSpacing: '-0.15px',
                          }}
                          className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Filter by status
                            </span>
                            {statusFilter !== 'ALL' && (
                              <button
                                onClick={() => setStatusFilter('ALL')}
                                className="text-[11px] text-[#00A843] hover:underline font-medium"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter('ALL');
                                setShowFilterMenu(false);
                              }}
                              className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition text-slate-800"
                            >
                              <span className={statusFilter === 'ALL' ? 'font-semibold text-[#00A843]' : 'font-normal'}>
                                All emails
                              </span>
                              {statusFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-[#00A843]" />}
                            </button>

                            {activeTab === 'scheduled' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter('SCHEDULED');
                                    setShowFilterMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition text-slate-800"
                                >
                                  <span className={statusFilter === 'SCHEDULED' ? 'font-semibold text-[#00A843]' : 'font-normal'}>
                                    Scheduled only
                                  </span>
                                  {statusFilter === 'SCHEDULED' && <Check className="w-3.5 h-3.5 text-[#00A843]" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter('QUEUED');
                                    setShowFilterMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition text-slate-800"
                                >
                                  <span className={statusFilter === 'QUEUED' ? 'font-semibold text-[#00A843]' : 'font-normal'}>
                                    Queued / Rate limited
                                  </span>
                                  {statusFilter === 'QUEUED' && <Check className="w-3.5 h-3.5 text-[#00A843]" />}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter('SENT');
                                    setShowFilterMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition text-slate-800"
                                >
                                  <span className={statusFilter === 'SENT' ? 'font-semibold text-[#00A843]' : 'font-normal'}>
                                    Sent successfully
                                  </span>
                                  {statusFilter === 'SENT' && <Check className="w-3.5 h-3.5 text-[#00A843]" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStatusFilter('FAILED');
                                    setShowFilterMenu(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition text-slate-800"
                                >
                                  <span className={statusFilter === 'FAILED' ? 'font-semibold text-[#00A843]' : 'font-normal'}>
                                    Failed delivery
                                  </span>
                                  {statusFilter === 'FAILED' && <Check className="w-3.5 h-3.5 text-[#00A843]" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsRefreshing(true);
                      fetchEmails();
                      setTimeout(() => setIsRefreshing(false), 700);
                    }}
                    className="p-1 hover:text-slate-600 transition rounded-md hover:bg-slate-100 active:scale-95 cursor-pointer"
                    title="Refresh"
                  >
                    {/* Clockwise circular reload icon matching Figma */}
                    <svg
                      className={`w-4 h-4 text-[#9CA3AF] hover:text-slate-600 transition-transform ${
                        isRefreshing || loading ? 'animate-spin text-[#00A843]' : ''
                      }`}
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

            {/* Email Rows List */}
            <div
              style={{
                paddingTop: '16px',
                paddingRight: '16px',
                paddingLeft: '16px',
                opacity: 1,
              }}
              className="flex-1 overflow-y-auto space-y-1"
            >
              {(() => {
                const filteredEmails = emails.filter((item) => {
                  if (statusFilter === 'ALL') return true;
                  if (statusFilter === 'QUEUED') return item.status === 'QUEUED' || item.status === 'RATE_LIMITED';
                  return item.status === statusFilter;
                });

                return loading ? (
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
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center space-y-5 select-none">
                  {searchQuery.trim() ? (
                    /* No search results state */
                    <>
                      <div className="flex items-center justify-center my-2">
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                          {/* Search circle */}
                          <circle cx="50" cy="50" r="30" fill="#F8FAF9" stroke="#CBD5E1" strokeWidth="2.5" />
                          {/* Ghost lines inside the search circle */}
                          <rect x="36" y="44" width="28" height="3" rx="1.5" fill="#E2E8F0" />
                          <rect x="36" y="52" width="20" height="3" rx="1.5" fill="#EEF2F5" />
                          <rect x="36" y="60" width="24" height="3" rx="1.5" fill="#E2E8F0" />
                          {/* Cross / x mark in center of circle */}
                          <circle cx="50" cy="50" r="13" fill="#F1F5F9" />
                          <path d="M44.5 44.5L55.5 55.5M55.5 44.5L44.5 55.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                          {/* Magnifier handle */}
                          <line x1="72" y1="72" x2="90" y2="90" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
                          <line x1="72" y1="72" x2="90" y2="90" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                          {/* Small green dot accent */}
                          <circle cx="76" cy="26" r="5" fill="#E5F5EB" />
                          <path d="M73.5 26l1.5 1.5 3-3" stroke="#00A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1.5">
                        <h4
                          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '15px', letterSpacing: '-0.15px' }}
                          className="font-semibold text-slate-800"
                        >
                          No results for &ldquo;{searchQuery}&rdquo;
                        </h4>
                        <p
                          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '13px', letterSpacing: '-0.15px' }}
                          className="text-slate-400 max-w-xs leading-relaxed"
                        >
                          We couldn&apos;t find any {activeTab} emails matching your search. Try a different keyword or clear the search.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '13px', letterSpacing: '-0.15px' }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E5F5EB]/60 font-medium transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear search
                      </button>
                    </>
                  ) : statusFilter !== 'ALL' ? (
                    /* Filter empty state */
                    <>
                      <div className="flex items-center justify-center my-2">
                        <div className="w-16 h-16 rounded-full bg-[#E5F5EB] flex items-center justify-center text-[#00A843]">
                          <Filter className="w-7 h-7 stroke-[1.75]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <h4
                          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '15px', letterSpacing: '-0.15px' }}
                          className="font-semibold text-slate-800"
                        >
                          No emails match status &ldquo;{statusFilter}&rdquo;
                        </h4>
                        <p
                          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '13px', letterSpacing: '-0.15px' }}
                          className="text-slate-400 max-w-xs leading-relaxed"
                        >
                          There are currently no emails with this status in your {activeTab} view.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", fontSize: '13px', letterSpacing: '-0.15px' }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#00A843] text-[#00A843] hover:bg-[#E5F5EB]/60 font-medium transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reset filter
                      </button>
                    </>
                  ) : activeTab === 'scheduled' ? (
                    /* Scheduled Empty State: Clean email inbox structure — no bubbles or circles */
                    <div className="w-72 space-y-0 rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] bg-white">
                      {/* Inbox header bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAF9] border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#00A843]" />
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em' }} className="text-slate-500 uppercase tracking-widest">Scheduled</span>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                          <span style={{ fontSize: '9px' }} className="text-slate-400 font-bold">0</span>
                        </div>
                      </div>
                      {/* Ghost email rows */}
                      {[{ w1: 'w-24', w2: 'w-40', dim: true }, { w1: 'w-20', w2: 'w-32', dim: false }, { w1: 'w-28', w2: 'w-36', dim: true }].map((row, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 ${
                            i === 1 ? 'bg-[#F0FBF5]' : 'bg-white'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
                            i === 1 ? 'bg-[#00A843]/10' : 'bg-slate-100'
                          }`}>
                            {i === 1 ? (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="#00A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-slate-200" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className={`h-2 rounded-full ${ i === 1 ? 'bg-[#00A843]/20' : 'bg-slate-100' } ${row.w1}`} />
                            <div className={`h-1.5 rounded-full bg-slate-100 ${row.w2}`} />
                          </div>
                          <div className={`h-5 w-14 rounded-full shrink-0 ${
                            i === 1 ? 'bg-[#E5F5EB] border border-[#C8E6C9]' : 'bg-slate-100'
                          }`} />
                        </div>
                      ))}
                      {/* Empty slot */}
                      <div className="px-4 py-3 bg-white flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-dashed border-slate-200 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-50 rounded-full" />
                      </div>
                    </div>
                  ) : (
                    /* Sent Empty State: Classic empty mailbox illustration */
                    <div className="flex items-center justify-center my-2">
                      <svg width="140" height="130" viewBox="0 0 140 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                        {/* Mailbox post */}
                        <rect x="64" y="95" width="12" height="28" rx="3" fill="#E2E8F0" />
                        {/* Mailbox base platform */}
                        <rect x="44" y="118" width="52" height="7" rx="3.5" fill="#CBD5E1" />
                        {/* Mailbox body */}
                        <rect x="24" y="44" width="92" height="56" rx="14" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
                        {/* Mailbox door / flap */}
                        <path d="M24 58 Q70 78 116 58" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />
                        {/* Door slit at top of mailbox */}
                        <rect x="38" y="40" width="64" height="8" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
                        {/* Mailbox flag */}
                        <rect x="110" y="50" width="4" height="22" rx="2" fill="#CBD5E1" />
                        <rect x="110" y="50" width="14" height="10" rx="3" fill="#E2E8F0" />
                        {/* Empty label lines inside body */}
                        <rect x="44" y="68" width="36" height="3" rx="1.5" fill="#E2E8F0" />
                        <rect x="44" y="76" width="24" height="3" rx="1.5" fill="#EEF2F5" />
                        {/* Small green leaf / dot accent */}
                        <circle cx="70" cy="44" r="6" fill="#E5F5EB" />
                        <path d="M67.5 44l2 2 3-3" stroke="#00A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Tiny envelope floating above */}
                        <g opacity="0.45">
                          <rect x="80" y="14" width="28" height="20" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
                          <path d="M80 18 L94 26 L108 18" stroke="#CBD5E1" strokeWidth="1.2" fill="none" />
                        </g>
                        <g opacity="0.25">
                          <rect x="30" y="8" width="22" height="16" rx="3" fill="white" stroke="#CBD5E1" strokeWidth="1.2" />
                          <path d="M30 12 L41 18 L52 12" stroke="#CBD5E1" strokeWidth="1" fill="none" />
                        </g>
                      </svg>
                    </div>
                  )}

                  {/* Title and description — only shown when no active search */}
                  {!searchQuery.trim() && (
                    <>
                      <h4
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '15px',
                          letterSpacing: '-0.15px',
                        }}
                        className="font-semibold text-slate-800"
                      >
                        {activeTab === 'scheduled' ? 'No scheduled emails' : 'Mailbox is empty'}
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
                          : 'Nothing here yet — sent emails will show up once your campaigns start delivering.'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      setShowRecipientDetails(false);
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
                          {stripHtml(email.body) || 'No message content'}
                        </span>
                      </div>
                    </div>

                    {/* Star icon at far right */}
                    <div className="pl-6 pr-6">
                      <Star className="w-4 h-4 text-slate-300 hover:text-amber-400 stroke-[1.5] transition" />
                    </div>
                  </div>
                ))
              );
            })()}
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
            className="flex-1 flex flex-col h-full overflow-hidden bg-white"
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
                {currentUser.avatarUrl && !imageLoadFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadFailed(true)}
                    className="w-8 h-8 rounded-full object-cover ml-2 shrink-0 border border-slate-200"
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
              {/* Sender & Recipient header matching Gmail / modern email client style */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3.5">
                  {/* User Avatar */}
                  {currentUser.avatarUrl && !imageLoadFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name || 'User'}
                      referrerPolicy="no-referrer"
                      onError={() => setImageLoadFailed(true)}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#00A843] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      {currentUser.name
                        ? currentUser.name.charAt(0).toUpperCase()
                        : 'O'}
                    </div>
                  )}

                  {/* Sender details and Expandable 'to me / to [Recipient Name]' row */}
                  <div className="space-y-0.5">
                    {/* First line: Name and <email> */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '15px',
                          letterSpacing: '-0.2px',
                        }}
                        className="font-bold text-slate-900"
                      >
                        {currentUser.name || 'Oliver Brown'}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-inter), 'Inter', sans-serif",
                          fontSize: '13.5px',
                          letterSpacing: '-0.15px',
                        }}
                        className="text-slate-500 font-normal"
                      >
                        &lt;{selectedEmail.sender?.email || currentUser.email || 'oliver.brown@domain.io'}&gt;
                      </span>
                    </div>

                    {/* Second line: 'to [Recipient Name]' with expand arrow */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowRecipientDetails(!showRecipientDetails)}
                        className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition cursor-pointer py-0.5"
                      >
                        <span>to {formatRecipientName(selectedEmail.recipient)}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            showRecipientDetails ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Expanded Recipient Details popover / card */}
                      {showRecipientDetails && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setShowRecipientDetails(false)}
                          />
                          <div
                            style={{
                              fontFamily: "var(--font-inter), 'Inter', sans-serif",
                              letterSpacing: '-0.15px',
                            }}
                            className="absolute left-0 top-full mt-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-xl w-80 text-xs space-y-2 z-40 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="grid grid-cols-[55px_1fr] gap-x-2 text-slate-600">
                              <span className="text-slate-400 font-medium">from:</span>
                              <span className="text-slate-800 font-semibold truncate">
                                {currentUser.name} &lt;{selectedEmail.sender?.email || currentUser.email}&gt;
                              </span>
                            </div>
                            <div className="grid grid-cols-[55px_1fr] gap-x-2 text-slate-600">
                              <span className="text-slate-400 font-medium">to:</span>
                              <span className="text-slate-800 font-semibold truncate">
                                {formatRecipientName(selectedEmail.recipient)} &lt;{selectedEmail.recipient}&gt;
                              </span>
                            </div>
                            <div className="grid grid-cols-[55px_1fr] gap-x-2 text-slate-600">
                              <span className="text-slate-400 font-medium">date:</span>
                              <span className="text-slate-700">
                                {new Date(selectedEmail.sentAt || selectedEmail.scheduledAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-[55px_1fr] gap-x-2 text-slate-600">
                              <span className="text-slate-400 font-medium">subject:</span>
                              <span className="text-slate-700 truncate">{selectedEmail.subject}</span>
                            </div>
                            <div className="grid grid-cols-[55px_1fr] gap-x-2 text-slate-600">
                              <span className="text-slate-400 font-medium">status:</span>
                              <span className="inline-block text-[#00A843] font-semibold">
                                {selectedEmail.status}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
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

              {/* Message text with rich-preview styling */}
              <div
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                  lineHeight: '160%',
                }}
                className="text-slate-800 pt-1 space-y-4"
              >
                <div
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: '14px',
                    letterSpacing: '-0.15px',
                    lineHeight: '160%',
                  }}
                  className="rich-preview text-slate-700 bg-[#F9FBFA] p-6 rounded-2xl border border-slate-100/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
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
            className="flex-1 flex flex-col h-full overflow-y-auto relative bg-white"
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
                  <span>{currentUser.email || 'user@reachinbox.ai'}</span>
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

                {/* Text Size Dropdown */}
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowTextSizeSlider(!showTextSizeSlider); }}
                    className={`p-1.5 rounded-md transition font-medium flex items-center gap-1 ${
                      showTextSizeSlider || textSize !== 14
                        ? 'bg-[#E5F5EB] text-[#00A843] font-bold ring-1 ring-[#00A843]/30'
                        : 'hover:text-slate-900 hover:bg-slate-200/60 text-slate-600'
                    }`}
                    title="Change font size"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold w-6 text-center">{textSize}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </button>

                  {/* Font Size Dropdown Popover */}
                  {showTextSizeSlider && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute bottom-full mb-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] overflow-hidden w-28"
                    >
                      <div className="px-3 py-2 bg-[#F8FAF9] border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Size</span>
                      </div>
                      <div className="py-1 max-h-48 overflow-y-auto">
                        {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36].map((px) => (
                          <button
                            key={px}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); applyExactFontSize(px); setShowTextSizeSlider(false); }}
                            className={`w-full text-left px-3 py-1.5 text-[13px] transition ${
                              textSize === px
                                ? 'bg-[#E5F5EB] text-[#00A843] font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {px}px
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

            {/* Send Later Modal — Custom date + time picker */}
            {showSendLater && (() => {
              const now = new Date();
              const parseSelected = scheduledDateStr ? new Date(scheduledDateStr) : null;

              // Build mini-calendar state from selected or today
              const calBase = parseSelected || now;
              const calYear = calBase.getFullYear();
              const calMonth = calBase.getMonth();
              const calDay = parseSelected ? parseSelected.getDate() : now.getDate();
              const selHour = parseSelected ? parseSelected.getHours() : (now.getHours() + 1) % 24;
              const selMinute = parseSelected ? parseSelected.getMinutes() : 0;

              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const firstDow = new Date(calYear, calMonth, 1).getDay();
              const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

              const applyDate = (y: number, mo: number, d: number, h: number, m: number) => {
                const dt = new Date(y, mo, d, h, m);
                const pad = (n: number) => String(n).padStart(2, '0');
                setScheduledDateStr(`${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(m)}`);
              };

              return (
                <div
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    letterSpacing: '-0.15px',
                  }}
                  className="absolute top-16 right-8 w-80 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-slate-100 z-30 overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 style={{ fontSize: '14px', letterSpacing: '-0.15px' }} className="font-bold text-slate-900">Schedule Send</h3>
                    <button
                      onClick={() => setShowSendLater(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Quick options */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Tomorrow 9 AM', h: 9, m: 0, offset: 1 },
                        { label: 'Tomorrow 12 PM', h: 12, m: 0, offset: 1 },
                        { label: 'In 2 days 9 AM', h: 9, m: 0, offset: 2 },
                        { label: 'Next Monday 9 AM', h: 9, m: 0, offset: (() => { const d = new Date(); const dow = d.getDay(); return (dow === 0 ? 1 : 8 - dow); })() },
                      ].map((opt) => {
                        const d = new Date(); d.setDate(d.getDate() + opt.offset); d.setHours(opt.h, opt.m, 0, 0);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        const val = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(opt.h)}:${pad(opt.m)}`;
                        const isActive = scheduledDateStr === val;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setScheduledDateStr(val)}
                            style={{ fontSize: '12px', letterSpacing: '-0.1px' }}
                            className={`px-2.5 py-2 rounded-xl border text-left font-medium transition ${
                              isActive
                                ? 'bg-[#E5F5EB] border-[#00A843] text-[#00A843]'
                                : 'bg-[#F8FAF9] border-slate-100 text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span style={{ fontSize: '11px' }} className="text-slate-400 font-medium uppercase tracking-wider">Or pick custom</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Mini Calendar */}
                    <div>
                      {/* Month nav */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(calYear, calMonth - 1, 1);
                            applyDate(d.getFullYear(), d.getMonth(), 1, selHour, selMinute);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: 600 }} className="text-slate-800">
                          {monthNames[calMonth]} {calYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(calYear, calMonth + 1, 1);
                            applyDate(d.getFullYear(), d.getMonth(), 1, selHour, selMinute);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </div>
                      {/* Day-of-week headers */}
                      <div className="grid grid-cols-7 mb-1">
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                          <div key={d} style={{ fontSize: '10px' }} className="text-center font-semibold text-slate-400 py-0.5">{d}</div>
                        ))}
                      </div>
                      {/* Day cells */}
                      <div className="grid grid-cols-7 gap-y-0.5">
                        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                          const isSelected = day === calDay;
                          const isPast = new Date(calYear, calMonth, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={isPast}
                              onClick={() => applyDate(calYear, calMonth, day, selHour, selMinute)}
                              style={{ fontSize: '12px' }}
                              className={`h-7 w-full rounded-lg font-medium transition ${
                                isSelected
                                  ? 'bg-[#00A843] text-white shadow-sm'
                                  : isToday
                                  ? 'border border-[#00A843] text-[#00A843]'
                                  : isPast
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-700 hover:bg-[#E5F5EB]'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time picker — 12-hour compact steppers */}
                    {(() => {
                      const isPM = selHour >= 12;
                      const display12 = selHour % 12 || 12; // 0→12, 13→1, etc.

                      const stepHourUp = () => {
                        const next12 = (display12 % 12) + 1; // 12→1, 1→2, ..., 11→12
                        const next24 = isPM ? (next12 === 12 ? 12 : next12 + 12) : (next12 === 12 ? 0 : next12);
                        applyDate(calYear, calMonth, calDay, next24, selMinute);
                      };
                      const stepHourDown = () => {
                        const prev12 = ((display12 - 2 + 12) % 12) + 1; // 1→12, 12→11, etc.
                        const prev24 = isPM ? (prev12 === 12 ? 12 : prev12 + 12) : (prev12 === 12 ? 0 : prev12);
                        applyDate(calYear, calMonth, calDay, prev24, selMinute);
                      };
                      const commitHour = (raw: string) => {
                        const n = parseInt(raw.replace(/\D/g, '') || '0', 10);
                        const clamped = Math.min(12, Math.max(1, n));
                        const h24 = isPM ? (clamped === 12 ? 12 : clamped + 12) : (clamped === 12 ? 0 : clamped);
                        applyDate(calYear, calMonth, calDay, h24, selMinute);
                      };
                      const commitMinute = (raw: string) => {
                        const n = parseInt(raw.replace(/\D/g, '') || '0', 10);
                        applyDate(calYear, calMonth, calDay, selHour, Math.min(59, Math.max(0, n)));
                      };

                      return (
                        <div className="flex items-center justify-center gap-2 pt-2 pb-0.5">

                          {/* Hour stepper */}
                          <div className="flex flex-col items-center gap-0.5">
                            <button type="button" onClick={stepHourUp}
                              className="w-12 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-[#00A843] hover:bg-[#E5F5EB]/60 transition">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 7.5L6 4L9.5 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              defaultValue={String(display12).padStart(2, '0')}
                              key={display12}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => commitHour(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') { e.preventDefault(); stepHourUp(); }
                                if (e.key === 'ArrowDown') { e.preventDefault(); stepHourDown(); }
                                if (e.key === 'Enter') { commitHour((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
                              }}
                              style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px', width: '52px', height: '38px', textAlign: 'center' }}
                              className="bg-[#F8FAF9] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00A843] focus:ring-2 focus:ring-[#00A843]/20 transition cursor-text"
                            />
                            <button type="button" onClick={stepHourDown}
                              className="w-12 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-[#00A843] hover:bg-[#E5F5EB]/60 transition">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>

                          {/* Separator */}
                          <span style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }} className="text-slate-200 select-none mb-0.5">:</span>

                          {/* Minute stepper */}
                          <div className="flex flex-col items-center gap-0.5">
                            <button type="button" onClick={() => applyDate(calYear, calMonth, calDay, selHour, (selMinute + 1) % 60)}
                              className="w-12 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-[#00A843] hover:bg-[#E5F5EB]/60 transition">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 7.5L6 4L9.5 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              defaultValue={String(selMinute).padStart(2, '0')}
                              key={selMinute}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => commitMinute(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') { e.preventDefault(); applyDate(calYear, calMonth, calDay, selHour, (selMinute + 1) % 60); }
                                if (e.key === 'ArrowDown') { e.preventDefault(); applyDate(calYear, calMonth, calDay, selHour, (selMinute - 1 + 60) % 60); }
                                if (e.key === 'Enter') { commitMinute((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
                              }}
                              style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px', width: '52px', height: '38px', textAlign: 'center' }}
                              className="bg-[#F8FAF9] border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00A843] focus:ring-2 focus:ring-[#00A843]/20 transition cursor-text"
                            />
                            <button type="button" onClick={() => applyDate(calYear, calMonth, calDay, selHour, (selMinute - 1 + 60) % 60)}
                              className="w-12 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-[#00A843] hover:bg-[#E5F5EB]/60 transition">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>

                          {/* AM / PM toggle */}
                          <div className="flex flex-col gap-1 ml-1">
                            <button type="button"
                              onClick={() => { if (isPM) applyDate(calYear, calMonth, calDay, selHour - 12, selMinute); }}
                              style={{ fontSize: '11px', fontWeight: 700 }}
                              className={`px-2.5 py-1 rounded-lg transition ${!isPM ? 'bg-[#00A843] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'}`}>
                              AM
                            </button>
                            <button type="button"
                              onClick={() => { if (!isPM) applyDate(calYear, calMonth, calDay, selHour + 12, selMinute); }}
                              style={{ fontSize: '11px', fontWeight: 700 }}
                              className={`px-2.5 py-1 rounded-lg transition ${isPM ? 'bg-[#00A843] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'}`}>
                              PM
                            </button>
                          </div>

                        </div>
                      );
                    })()}

                    {/* Selected summary */}
                    {scheduledDateStr && (
                      <div style={{ fontSize: '12px' }} className="flex items-center gap-2 bg-[#E5F5EB] border border-[#C8E6C9] px-3 py-2 rounded-xl text-[#1B5E20]">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">
                          {new Date(scheduledDateStr).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setScheduledDateStr(''); setShowSendLater(false); }}
                      style={{ fontSize: '13px' }}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSendLater(false)}
                      style={{ fontSize: '13px' }}
                      className="px-4 py-1.5 rounded-full bg-[#00A843] text-white font-semibold hover:bg-[#008a37] transition shadow-sm"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
