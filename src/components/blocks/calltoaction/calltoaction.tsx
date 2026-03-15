import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CallToActionSection() {
  const t = useTranslations('HomePage.calltoaction');

  return (
    <section id="call-to-action" className="relative overflow-hidden px-4 py-28">
      {/* gradient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-background to-violet-500/10 dark:from-indigo-950/40 dark:via-background dark:to-violet-950/30" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsla(245,60%,50%,.08)_0%,transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            {t('description')}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-xl bg-indigo-600 px-10 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/30 transition-all duration-300"
            >
              <LocaleLink href="/waitlist">
                <span>{t('primaryButton')}</span>
              </LocaleLink>
            </Button>

            <Button asChild size="lg" variant="ghost" className="rounded-xl px-8 text-base">
              <LocaleLink href="/blog">
                <span>{t('secondaryButton')}</span>
                <ArrowRight className="ml-2 size-4" />
              </LocaleLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
