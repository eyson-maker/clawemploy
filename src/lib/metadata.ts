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
 * Generate JSON-LD structured data for the website
 * https://developers.google.com/search/docs/appearance/structured-data
 */
export function generateOrganizationJsonLd(): string {
  const baseUrl = getBaseUrl();
  const orgData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: defaultMessages.Metadata.name,
    url: baseUrl,
    logo: `${baseUrl}/logo.svg`,
    description: defaultMessages.Metadata.description,
    sameAs: [
      websiteConfig.metadata.social?.github,
      websiteConfig.metadata.social?.twitter,
    ].filter(Boolean),
  };
  return JSON.stringify(orgData);
}

/**
 * Generate JSON-LD structured data for SoftwareApplication
 */
export function generateSoftwareApplicationJsonLd(): string {
  const baseUrl = getBaseUrl();
  const appData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: defaultMessages.Metadata.name,
    applicationCategory: 'BusinessApplication',
    description: defaultMessages.Metadata.description,
    url: baseUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
    },
  };
  return JSON.stringify(appData);
}
