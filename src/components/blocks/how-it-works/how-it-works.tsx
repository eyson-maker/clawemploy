import { ChevronRight, MousePointerClickIcon, PlugIcon, RocketIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

const steps = [
  {
    key: 'step-1' as const,
    icon: MousePointerClickIcon,
    number: '01',
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    key: 'step-2' as const,
    icon: PlugIcon,
    number: '02',
    color: 'text-violet-400 bg-violet-400/10',
  },
  {
    key: 'step-3' as const,
    icon: RocketIcon,
    number: '03',
    color: 'text-green-400 bg-green-400/10',
  },
];

export default function HowItWorksSection() {
  const t = useTranslations('HomePage.howItWorks');

  return (
    <section id="how-it-works" className="px-4 py-28 bg-muted/20">
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

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.key} className="relative flex flex-col">
              {/* connector arrow (desktop only) */}
              {index < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                  <ChevronRight className="size-6 text-muted-foreground/30" />
                </div>
              )}

              <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-card/80">
                <div className={`mb-4 flex size-12 items-center justify-center rounded-lg ${step.color}`}>
                  <step.icon className="size-6" />
                </div>
                <span className="text-muted-foreground mb-2 font-mono text-xs font-semibold tracking-wider">
                  STEP {step.number}
                </span>
                <h3 className="text-foreground text-lg font-semibold">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`steps.${step.key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
