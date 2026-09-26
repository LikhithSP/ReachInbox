import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#FAFAFA] text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 text-center space-y-6">
        <span className="text-3xl font-black tracking-tight text-slate-950 font-mono">
          ONB
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          ReachInbox Email Scheduler
        </h1>
        <p className="text-slate-500 text-xs leading-relaxed">
          Persistent asynchronous email scheduling engine powered by BullMQ, Redis, MySQL, and Ethereal SMTP delivery.
        </p>
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full h-11 inline-flex items-center justify-center rounded-xl bg-[#00A843] hover:bg-[#00923a] text-white font-medium text-xs shadow-[0_2px_8px_rgba(0,168,67,0.25)] transition"
          >
            Open Dashboard
          </Link>
          <Link
            href="/login"
            className="w-full h-11 inline-flex items-center justify-center rounded-xl bg-[#E8F5E9] hover:bg-[#DDF0DF] text-[#1B5E20] font-medium text-xs transition"
          >
            Sign In / Login
          </Link>
        </div>
      </div>
    </main>
  );
}
