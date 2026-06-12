import type { LegalDoc } from './content'

const PRIVACY = { text: 'privacy@puzler.app', href: 'mailto:privacy@puzler.app' }

export const privacy: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'June 12, 2026',
  intro: [
    {
      p: [
        'This Privacy Policy explains how Puzler collects, uses, and protects your personal data, and the rights you have over it. Puzler is operated by Charlie Pugh, an individual based in the United States, who is the data controller for the purposes of the EU and UK General Data Protection Regulation (GDPR). You can reach us at ',
        PRIVACY,
        '.',
      ],
    },
  ],
  sections: [
    {
      heading: '1. Data We Collect',
      blocks: [
        {
          table: {
            head: ['Category', 'Examples'],
            rows: [
              ['Account data', 'Email address, username, password (stored only as a secure hash), profile bio and avatar.'],
              ['Sign-in identities', 'When you connect Google or Patreon, we store the provider, a provider user ID, and access tokens needed to maintain the connection. Tokens are encrypted at rest.'],
              ['Content', 'Puzzles, comments, ratings, and favorites you create.'],
              ['Usage data', 'Puzzle play history and progress, such as which puzzles you have solved and your saved board state.'],
              ['Technical data', 'Server logs containing request metadata (such as timestamps and request identifiers) used for security and debugging.'],
            ],
          },
        },
      ],
    },
    {
      heading: '2. How and Why We Use Your Data',
      blocks: [
        {
          ul: [
            'To provide the service — creating your account, saving your puzzles and progress, and signing you in. Legal basis: performance of our contract with you.',
            'To keep Puzler secure and working — preventing abuse, debugging, and maintaining the service. Legal basis: our legitimate interests.',
            'To communicate with you — sending account emails such as password resets. Legal basis: performance of our contract.',
            'To understand usage — privacy-friendly, cookieless analytics that do not identify you. Legal basis: our legitimate interests.',
          ],
        },
      ],
    },
    {
      heading: '3. Service Providers',
      blocks: [
        { p: 'We share data with a small number of processors who act on our behalf:' },
        {
          table: {
            head: ['Provider', 'Purpose'],
            rows: [
              ['SendGrid (Twilio)', 'Sending account emails such as password resets.'],
              ['Cloudflare R2', 'Storing uploaded files such as avatars.'],
              ['Google', 'Optional sign-in, if you choose "Continue with Google".'],
              ['Patreon', 'Optional sign-in, if you choose "Continue with Patreon".'],
              ['Plausible Analytics', 'Cookieless, privacy-friendly usage analytics.'],
              ['Error & performance monitoring', 'We may use services such as Bugsnag, Datadog, or New Relic to detect errors and monitor performance. These process technical data only.'],
              ['Hosting provider', 'Our infrastructure host stores the data needed to run Puzler.'],
            ],
          },
        },
        { p: 'We do not sell your personal data.' },
      ],
    },
    {
      heading: '4. International Transfers',
      blocks: [
        {
          p: 'Puzler is operated from the United States, and some of our providers are located in the United States or elsewhere. When we transfer personal data out of the EU, EEA, or UK, we rely on appropriate safeguards such as the European Commission’s Standard Contractual Clauses or an equivalent mechanism.',
        },
      ],
    },
    {
      heading: '5. Cookies and Local Storage',
      blocks: [
        {
          p: 'Puzler does not use tracking or advertising cookies, so we do not show a cookie consent banner. We use only the following:',
        },
        {
          table: {
            head: ['Name', 'Type', 'Purpose'],
            rows: [
              ['_puzler_session', 'Essential cookie', 'Maintains security state during third-party sign-in (OAuth). Required for the service to function.'],
              ['puzler_token', 'Browser local storage', 'Stores your sign-in token so you stay logged in. Not transmitted as a cookie.'],
            ],
          },
        },
        { p: 'Our analytics provider, Plausible, does not use cookies and does not track you across sites.' },
      ],
    },
    {
      heading: '6. Data Retention',
      blocks: [
        {
          p: 'We keep your personal data for as long as your account exists. When you delete your account, we permanently and immediately delete your account and associated personal data, including your puzzles, comments, ratings, favorites, play history, and connected sign-in identities. Limited records may persist briefly in backups or where retention is required by law.',
        },
      ],
    },
    {
      heading: '7. Your Rights',
      blocks: [
        { p: 'Depending on where you live, you have rights over your personal data. These include the right to:' },
        {
          ul: [
            'Access your data — download a copy from Settings → Your Data → Download my data.',
            'Erase your data — delete your account from Settings → Your Data → Delete account.',
            'Rectify inaccurate data — edit your profile in Settings.',
            'Port your data — your export is provided in a structured, machine-readable JSON format.',
            'Restrict or object to certain processing, and to withdraw consent where processing is based on consent.',
          ],
        },
        {
          p: [
            'To exercise any right not available in the app, email ',
            PRIVACY,
            '. If you are in the EU, EEA, or UK, you also have the right to lodge a complaint with your local data protection authority. If you are a California resident, you have similar rights under the CCPA/CPRA, including the right not to be discriminated against for exercising them.',
          ],
        },
      ],
    },
    {
      heading: '8. Children',
      blocks: [
        {
          p: 'Puzler is not directed to children under 13, and we do not knowingly collect data from them. Where a higher age of digital consent applies (such as in parts of the EU), we apply that age. If you believe a child has provided us personal data, contact us and we will delete it.',
        },
      ],
    },
    {
      heading: '9. Changes to This Policy',
      blocks: [
        {
          p: 'We may update this Privacy Policy from time to time. We will update the "Last updated" date above and, for material changes, provide a more prominent notice where appropriate.',
        },
      ],
    },
    {
      heading: '10. Contact',
      blocks: [
        { p: ['For any privacy question or request, contact us at ', PRIVACY, '.'] },
      ],
    },
  ],
}
