import { Code, DollarSign, Globe, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

const features = [
  { key: 'item-1', icon: Zap, color: 'text-yellow-400 bg-yellow-400/10' },
  { key: 'item-2', icon: DollarSign, color: 'text-green-400 bg-green-400/10' },
  { key: 'item-3', icon: Globe, color: 'text-blue-400 bg-blue-400/10' },
  { key: 'item-4', icon: Code, color: 'text-violet-400 bg-violet-400/10' },
] as const;

export default function FeaturesSection() {
  const t = useTranslations('HomePage.features');

  return (
    <section id="features" className="px-4 py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="mx-auto max-w-6xl">
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map(({ key, icon: Icon, color }) => (
            <div
              key={key}
              className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-card/80"
            >
              <div className={`mb-4 flex size-12 items-center justify-center rounded-lg ${color}`}>
                <Icon className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
