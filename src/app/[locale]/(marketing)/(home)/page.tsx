import AgentGridSection from '@/components/blocks/agents/agent-grid';
import CallToActionSection from '@/components/blocks/calltoaction/calltoaction';
import FaqSection from '@/components/blocks/faqs/faqs';
import FeaturesSection from '@/components/blocks/features/features';
import HeroSection from '@/components/blocks/hero/hero';
import HowItWorksSection from '@/components/blocks/how-it-works/how-it-works';
import LogoCloud from '@/components/blocks/logo-cloud/logo-cloud';
import { NewsletterCard } from '@/components/newsletter/newsletter-card';
import { constructMetadata, generateHomepageJsonLd } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

/**
 * https://next-intl.dev/docs/environments/actions-metadata-route-handlers#metadata-api
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return constructMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    pathname: '',
  });
}

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage(props: HomePageProps) {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations('HomePage');

  // Generate JSON-LD structured data
  const jsonLd = generateHomepageJsonLd();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="flex flex-col">
        <HeroSection />

        <LogoCloud />

        <AgentGridSection />

        <HowItWorksSection />

        <FeaturesSection />

        {/* TODO: Wire up Trust section component here */}

        <FaqSection />

        <CallToActionSection />

        <NewsletterCard />
      </div>
    </>
  );
}
