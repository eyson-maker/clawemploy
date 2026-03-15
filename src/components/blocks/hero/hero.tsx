import { AnimatedGroup } from '@/components/tailark/motion/animated-group';
import { TextEffect } from '@/components/tailark/motion/text-effect';
import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      y: 12,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  const t = useTranslations('HomePage.hero');
  const linkIntroduction = 'https://github.com/anthropics/openclaw';
  const linkPrimary = '/waitlist';
  const linkSecondary = '/#agents';

  return (
    <main id="hero" className="relative overflow-hidden">
      {/* gradient background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsla(245,60%,50%,.15)_0%,hsla(245,60%,50%,.05)_40%,transparent_70%)]" />
        <div className="absolute -top-20 left-1/4 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsla(270,60%,50%,.1)_0%,transparent_60%)]" />
        <div className="absolute top-20 right-1/4 h-[300px] w-[500px] translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsla(220,60%,50%,.08)_0%,transparent_60%)]" />
      </div>

      <section className="relative">
        <div className="pt-24 pb-32">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center">
              {/* introduction badge */}
              <AnimatedGroup variants={transitionVariants}>
                <LocaleLink
                  href={linkIntroduction}
                  className="hover:bg-accent group mx-auto flex w-fit items-center gap-2 rounded-full border border-border/50 p-1 pl-4 backdrop-blur-sm"
                >
                  <span className="text-foreground text-sm">
                    {t('introduction')}
                  </span>
                  <div className="size-6 overflow-hidden rounded-full duration-500">
                    <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                      <span className="flex size-6">
                        <ArrowRight className="m-auto size-3" />
                      </span>
                      <span className="flex size-6">
                        <ArrowRight className="m-auto size-3" />
                      </span>
                    </div>
                  </div>
                </LocaleLink>
              </AnimatedGroup>

              {/* title */}
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                as="h1"
                className="mt-10 text-balance text-5xl font-bold leading-tight tracking-tight font-bricolage-grotesque md:text-6xl xl:text-7xl"
              >
                {t('title')}
              </TextEffect>

              {/* description */}
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.5}
                as="p"
                className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl"
              >
                {t('description')}
              </TextEffect>

              {/* action buttons */}
              <AnimatedGroup
                variants={{
                  container: {
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.75,
                      },
                    },
                  },
                  ...transitionVariants,
                }}
                className="mt-12 flex flex-row items-center justify-center gap-4"
              >
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white hover:bg-indigo-500"
                >
                  <LocaleLink href={linkPrimary}>
                    <span className="text-nowrap">{t('primary')}</span>
                  </LocaleLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="rounded-xl px-8 text-base"
                >
                  <LocaleLink href={linkSecondary}>
                    <span className="text-nowrap">{t('secondary')}</span>
                    <ArrowRight className="ml-2 size-4" />
                  </LocaleLink>
                </Button>
              </AnimatedGroup>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
