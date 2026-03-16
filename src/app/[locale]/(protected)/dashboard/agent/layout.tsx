import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { getTranslations } from 'next-intl/server';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default async function AgentLayout({ children }: AgentLayoutProps) {
  const t = await getTranslations('AgentDashboard');

  const breadcrumbs = [
    {
      label: t('title'),
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {t('title')}
                </h1>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
