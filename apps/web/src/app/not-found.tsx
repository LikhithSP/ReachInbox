"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Home, Mail } from "lucide-react";

export default function NotFound() {
  useEffect(() => {
    document.title = "ReachInbox - Page Not Found";
  }, []);

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.15px" }}
      className="min-h-screen bg-gradient-to-b from-[#F5FAF7] to-[#FAFCFB] flex flex-col items-center justify-center p-6 text-slate-900 relative overflow-hidden select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00A843]/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#00A843]/3 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Illustration */}
        <div className="mb-8 relative">
          <svg
            width="200"
            height="180"
            viewBox="0 0 200 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            style={{ animation: "float 3.6s ease-in-out infinite" }}
          >
            <ellipse cx="100" cy="168" rx="44" ry="6" fill="#00A843" opacity="0.07" />
            <rect x="28" y="52" width="144" height="100" rx="14" fill="white" stroke="#CBD5E1" strokeWidth="2" />
            <path d="M28 66 L100 108 L172 66" stroke="#CBD5E1" strokeWidth="2" fill="none" />
            <path d="M28 52 L100 20 L172 52" fill="#F0FBF5" stroke="#CBD5E1" strokeWidth="2" />
            <text x="100" y="148" textAnchor="middle" fontFamily="'Inter', sans-serif" fontSize="28" fontWeight="800" letterSpacing="-1" fill="#1E293B">
              404
            </text>
            <circle cx="100" cy="108" r="14" fill="#E5F5EB" />
            <path d="M94 102L106 114M106 102L94 114" stroke="#00A843" strokeWidth="2.2" strokeLinecap="round" />
            <g opacity="0.6">
              <path d="M158 28 L160 22 L162 28 L168 30 L162 32 L160 38 L158 32 L152 30 Z" fill="#00A843" opacity="0.5" />
            </g>
            <circle cx="42" cy="44" r="4" fill="#E5F5EB" stroke="#C8E6C9" strokeWidth="1.5" />
            <circle cx="164" cy="42" r="3" fill="#E5F5EB" stroke="#C8E6C9" strokeWidth="1.5" />
            <circle cx="32" cy="135" r="3" fill="#F1F5F9" />
            <circle cx="170" cy="133" r="4" fill="#F1F5F9" />
          </svg>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-[#00A843] flex items-center justify-center shadow-sm">
            <Mail className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }} className="text-slate-800">
            ReachInbox
          </span>
        </div>

        <h1
          style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.6px", lineHeight: "1.15" }}
          className="text-slate-900 mb-3"
        >
          Page not found
        </h1>

        <p
          style={{ fontSize: "15px", letterSpacing: "-0.15px", lineHeight: "1.6" }}
          className="text-slate-500 mb-8 max-w-sm"
        >
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <Link
            href="/dashboard"
            style={{ fontSize: "14px", letterSpacing: "-0.15px" }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#00A843] text-white font-semibold hover:bg-[#008a37] transition shadow-sm hover:shadow-md"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            style={{ fontSize: "14px", letterSpacing: "-0.15px" }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>

        <div className="flex items-center gap-3 mt-10 w-full max-w-xs">
          <div className="flex-1 h-px bg-slate-100" />
          <span style={{ fontSize: "12px" }} className="text-slate-400 font-medium">
            or try these
          </span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <div className="mt-4 flex items-center gap-4 flex-wrap justify-center">
          {["Scheduled Emails", "Sent Emails", "Compose"].map((label) => (
            <Link
              key={label}
              href="/dashboard"
              style={{ fontSize: "13px", letterSpacing: "-0.1px" }}
              className="text-[#00A843] hover:underline font-medium underline-offset-2 transition"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <p
        style={{ fontSize: "12px", letterSpacing: "-0.1px" }}
        className="absolute bottom-6 text-slate-400"
      >
        &copy; {new Date().getFullYear()} ReachInbox &middot; Email Scheduler
      </p>
    </div>
  );
}
