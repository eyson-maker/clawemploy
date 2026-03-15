import { useTranslations } from 'next-intl';

export default function LogoCloudSection() {
  const t = useTranslations('HomePage.logocloud');

  return (
    <section id="logo-cloud" className="px-4 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center text-sm text-muted-foreground uppercase tracking-wider">
          {t('title')}
        </p>

        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 sm:gap-y-12">
          <img
            className="h-5 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/telegram.svg"
            alt="Telegram"
            height="20"
            width="auto"
          />
          <img
            className="h-5 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/discord.svg"
            alt="Discord"
            height="20"
            width="auto"
          />
          <img
            className="h-5 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/slack.svg"
            alt="Slack"
            height="20"
            width="auto"
          />
          <img
            className="h-4 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/github.svg"
            alt="GitHub"
            height="16"
            width="auto"
          />
          <img
            className="h-5 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/x-twitter.svg"
            alt="X (Twitter)"
            height="20"
            width="auto"
          />
          <img
            className="h-6 w-fit opacity-40 transition-opacity duration-300 hover:opacity-80 dark:invert"
            src="/svg/openai.svg"
            alt="OpenAI"
            height="24"
            width="auto"
          />
        </div>
      </div>
    </section>
  );
}
