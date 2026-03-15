import { ChartAreaInteractive } from '@/components/dashboard/chart-area-interactive';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DataTable } from '@/components/dashboard/data-table';
import { SectionCards } from '@/components/dashboard/section-cards';
import { getSession } from '@/lib/server';
import { getTranslations } from 'next-intl/server';

import data from './data.json';

/**
 * Dashboard page
 *
 * - Admin users see analytics dashboard with charts and data tables
 * - Regular users see a welcome page with quick links
 */
export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await getSession();
  const isAdmin = session?.user?.role === 'admin';

  const breadcrumbs = [
    {
      label: t('Dashboard.dashboard.title'),
      isCurrentPage: true,
    },
  ];

  if (isAdmin) {
    return (
      <>
        <DashboardHeader breadcrumbs={breadcrumbs} />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular user welcome page
  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
            {/* Welcome Section */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl">👋</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome, {session?.user?.name || 'there'}!
              </h1>
              <p className="text-muted-foreground max-w-md">
                Your AI agents are ready to work. Explore the tools below to get started.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickActionCard
                icon="🤖"
                title="AI Agents"
                description="Browse and deploy pre-configured AI agents for your projects."
                href="/"
              />
              <QuickActionCard
                icon="⚙️"
                title="Settings"
                description="Update your profile, security, and notification preferences."
                href="/settings/profile"
              />
              <QuickActionCard
                icon="📚"
                title="Documentation"
                description="Learn how to get the most out of ClawEmploy."
                href="/docs"
              />
              <QuickActionCard
                icon="💬"
                title="Contact Us"
                description="Have questions? Reach out to our support team."
                href="/contact"
              />
              <QuickActionCard
                icon="📝"
                title="Blog"
                description="Read the latest updates, guides, and AI insights."
                href="/blog"
              />
              <QuickActionCard
                icon="🗺️"
                title="Roadmap"
                description="See what's coming next for ClawEmploy."
                href="/roadmap"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </a>
  );
}
