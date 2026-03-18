import { PaymentTypes, PlanIntervals } from '@/payment/types';
import type { WebsiteConfig } from '@/types';

/**
 * website config, without translations
 */
export const websiteConfig: WebsiteConfig = {
  ui: {
    mode: {
      defaultMode: 'light',
      enableSwitch: true,
    },
  },
  metadata: {
    images: {
      ogImage: '/og-image.png',
      logoLight: '/logo.svg',
      logoDark: '/logo-dark.svg',
    },
    social: {
      github: 'https://github.com/clawemploy',
      twitter: 'https://x.com/clawemploy',
    },
  },
  features: {
    enableUpgradeCard: false,
    enableUpdateAvatar: false,
    enableAffonsoAffiliate: false,
    enablePromotekitAffiliate: false,
    enableDatafastRevenueTrack: false,
    enableCrispChat: false,
    enableTurnstileCaptcha: false,
  },
  routes: {
    defaultLoginRedirect: '/dashboard',
  },
  analytics: {
    enableVercelAnalytics: true,
    enableSpeedInsights: true,
  },
  auth: {
    enableGoogleLogin: true,
    enableGithubLogin: false,
    enableCredentialLogin: true,
  },
  i18n: {
    defaultLocale: 'en',
    locales: {
      en: {
        flag: '🇺🇸',
        name: 'English',
        hreflang: 'en',
      },
      zh: {
        flag: '🇨🇳',
        name: '中文',
        hreflang: 'zh-CN',
      },
    },
  },
  blog: {
    enable: true,
    paginationSize: 6,
    relatedPostsSize: 3,
  },
  docs: {
    enable: false,
  },
  mail: {
    provider: 'resend',
    fromEmail: 'ClawEmploy <support@clawemploy.com>',
    supportEmail: 'support@clawemploy.com',
  },
  newsletter: {
    enable: true,
    provider: 'resend',
    autoSubscribeAfterSignUp: true,
  },
  storage: {
    enable: false,
    provider: 's3',
  },
  payment: {
    provider: 'creem',
  },
  price: {
    plans: {
      free: {
        id: 'free',
        prices: [],
        isFree: true,
        isLifetime: false,
        credits: {
          enable: false,
          amount: 0,
          expireDays: 30,
        },
      },
      starter: {
        id: 'starter',
        prices: [
          {
            type: PaymentTypes.SUBSCRIPTION,
            priceId: 'prod_starter_monthly',
            amount: 2900,
            currency: 'USD',
            interval: PlanIntervals.MONTH,
          },
        ],
        isFree: false,
        isLifetime: false,
        credits: {
          enable: true,
          amount: 100,
          expireDays: 30,
        },
      },
      pro: {
        id: 'pro',
        prices: [
          {
            type: PaymentTypes.SUBSCRIPTION,
            priceId: 'prod_pro_monthly',
            amount: 7900,
            currency: 'USD',
            interval: PlanIntervals.MONTH,
          },
        ],
        isFree: false,
        isLifetime: false,
        popular: true,
        credits: {
          enable: true,
          amount: 300,
          expireDays: 30,
        },
      },
      dedicated: {
        id: 'dedicated',
        prices: [
          {
            type: PaymentTypes.SUBSCRIPTION,
            priceId: 'prod_dedicated_monthly',
            amount: 19900,
            currency: 'USD',
            interval: PlanIntervals.MONTH,
          },
        ],
        isFree: false,
        isLifetime: false,
        credits: {
          enable: true,
          amount: 800,
          expireDays: 30,
        },
      },
    },
  },
  credits: {
    enableCredits: true,
    enablePackagesForFreePlan: false,
    registerGiftCredits: {
      enable: false,
      amount: 0,
      expireDays: 30,
    },
    packages: {
      basic: {
        id: 'basic',
        amount: 50,
        price: {
          priceId: 'prod_credits_basic',
          amount: 900,
          currency: 'USD',
        },
        popular: false,
      },
      standard: {
        id: 'standard',
        amount: 150,
        price: {
          priceId: 'prod_credits_standard',
          amount: 1900,
          currency: 'USD',
        },
        popular: false,
      },
      premium: {
        id: 'premium',
        amount: 500,
        price: {
          priceId: 'prod_credits_premium',
          amount: 4900,
          currency: 'USD',
        },
        popular: true,
      },
    },
  },
};
