'use client';

import type { PricePlan } from '@/payment/types';
import { useTranslations } from 'next-intl';
import { websiteConfig } from './website';

/**
 * Get price plans with translations for client components
 *
 * NOTICE: This function should only be used in client components.
 * If you need to get the price plans in server components, use getAllPricePlans instead.
 * Use this function when showing the pricing table or the billing card to the user.
 *
 * docs:
 * https://mksaas.com/docs/config/price
 *
 * @returns The price plans with translated content
 */
export function usePricePlans(): Record<string, PricePlan> {
  const t = useTranslations('PricePlans');
  const priceConfig = websiteConfig.price;
  const plans: Record<string, PricePlan> = {};

  // Add translated content to each plan
  if (priceConfig.plans.free) {
    plans.free = {
      ...priceConfig.plans.free,
      name: t('free.name'),
      description: t('free.description'),
      features: [
        t('free.features.feature-1'),
        t('free.features.feature-2'),
        t('free.features.feature-3'),
        t('free.features.feature-4'),
      ],
      limits: [
        t('free.limits.limit-1'),
        t('free.limits.limit-2'),
        t('free.limits.limit-3'),
      ],
    };
  }

  if (priceConfig.plans.pro) {
    plans.pro = {
      ...priceConfig.plans.pro,
      name: t('pro.name'),
      description: t('pro.description'),
      features: [
        t('pro.features.feature-1'),
        t('pro.features.feature-2'),
        t('pro.features.feature-3'),
        t('pro.features.feature-4'),
        t('pro.features.feature-5'),
      ],
    };
  }

  if (priceConfig.plans.lifetime) {
    plans.lifetime = {
      ...priceConfig.plans.lifetime,
      name: t('lifetime.name'),
      description: t('lifetime.description'),
      features: [
        t('lifetime.features.feature-1'),
        t('lifetime.features.feature-2'),
        t('lifetime.features.feature-3'),
        t('lifetime.features.feature-4'),
        t('lifetime.features.feature-5'),
        t('lifetime.features.feature-6'),
        t('lifetime.features.feature-7'),
      ],
      limits: [],
    };
  }

  if (priceConfig.plans.starter) {
    plans.starter = {
      ...priceConfig.plans.starter,
      name: t('starter.name'),
      description: t('starter.description'),
      features: [
        t('starter.features.feature-1'),
        t('starter.features.feature-2'),
        t('starter.features.feature-3'),
        t('starter.features.feature-4'),
      ],
    };
  }

  if (priceConfig.plans.dedicated) {
    plans.dedicated = {
      ...priceConfig.plans.dedicated,
      name: t('dedicated.name'),
      description: t('dedicated.description'),
      features: [
        t('dedicated.features.feature-1'),
        t('dedicated.features.feature-2'),
        t('dedicated.features.feature-3'),
        t('dedicated.features.feature-4'),
        t('dedicated.features.feature-5'),
      ],
    };
  }

  return plans;
}
