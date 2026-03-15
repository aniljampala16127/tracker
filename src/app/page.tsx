import Link from "next/link";
import { PlaneIcon, ClockIcon, UsersIcon, BarChartIcon } from "@/components/icons";

export default function HomePage() {
  return (
    <div className="py-12 sm:py-20">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 text-brand-500 mb-4">
          <PlaneIcon size={32} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sand-900 tracking-tight mb-4">
          Track your spousal sponsorship
          <br />
          <span className="text-brand-500">alongside the community</span>
        </h1>
        <p className="text-sand-500 max-w-lg mx-auto mb-8 text-base">
          Free, open tracker for Canadian spousal sponsorship applications.
          See real processing times from real applicants — not just IRCC estimates.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors"
          >
            Start Tracking — No Sign Up
          </Link>
          <Link
            href="/community"
            className="inline-flex items-center gap-2 border border-sand-200 bg-white text-sand-700 px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-sand-50 transition-colors"
          >
            Browse Community Data
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        <FeatureCard
          icon={<ClockIcon size={24} className="text-brand-500" />}
          title="Real Processing Times"
          desc="Community-reported step durations updated in real-time. Know how long each step actually takes — not the official 12-month estimate."
        />
        <FeatureCard
          icon={<UsersIcon size={24} className="text-brand-500" />}
          title="Monthly Cohorts"
          desc="Compare your progress with others who submitted the same month. See how your Feb 2025 cohort is tracking vs Jan or March."
        />
        <FeatureCard
          icon={<BarChartIcon size={24} className="text-brand-500" />}
          title="Smart Analytics"
          desc="Breakdowns by stream, country, and province. Percentile bands show if you're ahead or behind the curve."
        />
      </div>

      {/* How it works */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center text-sand-900 mb-8">
          How it works
        </h2>
        <div className="space-y-6">
          <Step num="1" title="Add your application">
            Enter your initials, country, stream (Outland/Inland), and submission
            date. No account needed — just like adding a row to a spreadsheet.
          </Step>
          <Step num="2" title="Update each milestone">
            When you hit AOR, eligibility, medical, etc. — mark it with the
            date. Takes 5 seconds.
          </Step>
          <Step num="3" title="See community averages">
            Your data contributes to real-time processing averages. Everyone
            benefits from shared visibility.
          </Step>
        </div>
      </div>

      {/* Streams info */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center text-sand-900 mb-8">
          Processing Time Estimates
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white border border-sand-200 rounded-xl p-5">
            <h3 className="font-bold text-brand-600 mb-2">Outland</h3>
            <p className="text-2xl font-bold text-sand-900 mb-1">5–12 months</p>
            <p className="text-xs text-sand-500">
              Spouse applies from outside Canada. Generally faster processing.
              IRCC service standard: 12 months.
            </p>
          </div>
          <div className="bg-white border border-sand-200 rounded-xl p-5">
            <h3 className="font-bold text-warn-dark mb-2">Inland</h3>
            <p className="text-2xl font-bold text-sand-900 mb-1">12–28 months</p>
            <p className="text-xs text-sand-500">
              Spouse is already in Canada. Longer processing but can apply for
              Open Work Permit while waiting.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 text-center">
        <p className="text-sand-500 mb-4">
          Open to everyone — no account required
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors"
        >
          Open Tracker
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-sm text-sand-900 mb-1">{title}</h3>
      <p className="text-xs text-sand-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-sm text-sand-900 mb-0.5">{title}</h3>
        <p className="text-sm text-sand-500">{children}</p>
      </div>
    </div>
  );
}
