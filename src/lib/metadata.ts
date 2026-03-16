import { websiteConfig } from '@/config/website';
import { defaultMessages } from '@/i18n/messages';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { generateAlternates, getCurrentHreflang } from './hreflang';
import { getBaseUrl, getImageUrl, getUrlWithLocale } from './urls/urls';

/**
 * Construct the metadata object for the current page (in docs/guides)
 */
export function constructMetadata({
  title,
  description,
  image,
  noIndex = false,
  locale,
  pathname,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  locale?: Locale;
  pathname?: string;
} = {}): Metadata {
  title = title || defaultMessages.Metadata.title;
  description = description || defaultMessages.Metadata.description;
  image = image || websiteConfig.metadata.images?.ogImage;
  const ogImageUrl = getImageUrl(image || '');

  // Generate canonical URL from pathname and locale
  const canonicalUrl = locale
    ? getUrlWithLocale(pathname || '', locale).replace(/\/$/, '')
    : undefined;

  // Generate hreflang alternates if pathname is provided and we have multiple locales
  const alternates =
    pathname && routing.locales.length > 1
      ? {
          canonical: canonicalUrl,
          ...generateAlternates(pathname),
        }
      : canonicalUrl
        ? { canonical: canonicalUrl }
        : undefined;

  return {
    title,
    description,
    alternates,
    openGraph: {
      type: 'website',
      locale: locale ? getCurrentHreflang(locale).replace('-', '_') : 'en_US',
      url: canonicalUrl,
      title,
      description,
      siteName: defaultMessages.Metadata.name,
      images: [ogImageUrl.toString()],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
      site: getBaseUrl(),
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-32x32.png',
      apple: '/apple-touch-icon.png',
    },
    metadataBase: new URL(getBaseUrl()),
    manifest: `${getBaseUrl()}/manifest.webmanifest`,
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

/**
 * Generate combined JSON-LD structured data for the homepage
 * https://developers.google.com/search/docs/appearance/structured-data
 */
export function generateHomepageJsonLd(): string {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawEmploy',
    url: 'https://clawemploy.com',
    logo: 'https://clawemploy.com/og-image.png',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@clawemploy.com',
      contactType: 'customer service',
    },
    sameAs: [
      'https://x.com/clawemploy',
      'https://github.com/clawemploy',
    ],
  };

  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawEmploy',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
      'Hire AI agents that actually do the work. Developer, SEO, marketing, research — all through chat.',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '29',
      highPrice: '199',
      priceCurrency: 'USD',
      offerCount: '3',
    },
  };

  return JSON.stringify([organization, softwareApplication]);
}
