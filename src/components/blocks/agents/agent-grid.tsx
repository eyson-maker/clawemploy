import {
  Bug,
  ClipboardList,
  FileText,
  Search,
  Server,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const agents = [
  { key: 'item-1', icon: Search, color: 'text-blue-400 bg-blue-400/10' },
  { key: 'item-2', icon: TrendingUp, color: 'text-green-400 bg-green-400/10' },
  { key: 'item-3', icon: Bug, color: 'text-red-400 bg-red-400/10' },
  { key: 'item-4', icon: Server, color: 'text-orange-400 bg-orange-400/10' },
  { key: 'item-5', icon: FileText, color: 'text-violet-400 bg-violet-400/10' },
  { key: 'item-6', icon: ClipboardList, color: 'text-cyan-400 bg-cyan-400/10' },
] as const;

export default function AgentGridSection() {
  const t = useTranslations('HomePage.agents');

  return (
    <section id="agents" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        {/* left-aligned header like Gumloop */}
        <div className="mb-12 max-w-2xl">
          <span className="text-primary mb-3 block font-mono text-sm font-semibold uppercase tracking-wider">
            {t('title')}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t('subtitle')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(({ key, icon: Icon, color }) => (
            <div
              key={key}
              className="group relative rounded-xl border border-border/50 bg-card/30 p-6 transition-all duration-300 hover:border-primary/40 hover:bg-card/80"
            >
              {/* tag */}
              <span className="mb-4 inline-block rounded-md bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
                {t(`items.${key}.tag`)}
              </span>

              {/* icon + title */}
              <div className="flex items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {t(`items.${key}.title`)}
                </h3>
              </div>

              {/* description */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
