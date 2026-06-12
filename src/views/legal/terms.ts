import type { LegalDoc } from './content'

const SUPPORT = { text: 'support@puzler.app', href: 'mailto:support@puzler.app' }

export const terms: LegalDoc = {
  title: 'Terms of Service',
  updated: 'June 12, 2026',
  intro: [
    {
      p: 'Welcome to Puzler. These Terms of Service ("Terms") are a binding agreement between you and Puzler, a service operated by Charlie Pugh, an individual based in the United States ("Puzler", "we", "us", or "our"). By creating an account or using Puzler, you agree to these Terms. If you do not agree, please do not use the service.',
    },
  ],
  sections: [
    {
      heading: '1. Eligibility',
      blocks: [
        {
          p: 'You must be at least 13 years old to use Puzler. If you live in the European Union, the European Economic Area, or the United Kingdom, you must be at least the age of digital consent in your country (which may be 13, 14, 15, or 16). By using Puzler you represent that you meet these requirements and that you have the legal capacity to enter into these Terms.',
        },
      ],
    },
    {
      heading: '2. Your Account',
      blocks: [
        {
          p: 'You may create an account with an email address and password, or by signing in through a third-party provider (Google or Patreon). You are responsible for keeping your login credentials secure and for all activity that occurs under your account. Notify us promptly if you believe your account has been compromised. You may delete your account at any time from your account settings.',
        },
      ],
    },
    {
      heading: '3. Your Content',
      blocks: [
        {
          p: 'Puzler lets you create, publish, and share puzzles, comments, and other content ("Your Content"). You retain all ownership rights in Your Content.',
        },
        {
          p: 'By publishing Your Content on Puzler, you grant us a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and distribute Your Content for the purpose of operating and providing the service. You also grant other users a license to access and play the puzzles you publish through Puzler. These licenses end when you delete Your Content or your account, except that we may retain backup copies for a limited period and to the extent required by law.',
        },
        {
          p: 'You are solely responsible for Your Content and represent that you have the rights necessary to publish it and to grant the licenses above.',
        },
      ],
    },
    {
      heading: '4. Acceptable Use',
      blocks: [
        { p: 'You agree not to:' },
        {
          ul: [
            'Violate any law or the rights of others, including intellectual property rights;',
            'Upload content that is unlawful, harassing, hateful, or harmful to others;',
            'Attempt to gain unauthorized access to the service, other accounts, or our systems;',
            'Interfere with or disrupt the service, including through automated scraping or abuse of our API beyond reasonable use;',
            'Impersonate any person or misrepresent your affiliation with anyone.',
          ],
        },
      ],
    },
    {
      heading: '5. Supporter Features',
      blocks: [
        {
          p: 'Puzler may offer optional paid or supporter features in the future, including through Patreon. Any additional terms applicable to those features will be presented to you at the time they are offered.',
        },
      ],
    },
    {
      heading: '6. Our Intellectual Property',
      blocks: [
        {
          p: 'The Puzler name, software, design, and branding are owned by us and protected by intellectual property laws. These Terms do not grant you any right to use our trademarks or branding without our prior written permission. Your Content remains yours, as described above.',
        },
      ],
    },
    {
      heading: '7. Copyright Complaints (DMCA)',
      blocks: [
        {
          p: [
            'We respect intellectual property rights. If you believe content on Puzler infringes your copyright, send a notice to ',
            SUPPORT,
            ' including: a description of the copyrighted work; the location of the allegedly infringing material on Puzler; your contact information; a statement that you have a good-faith belief the use is not authorized; and a statement, under penalty of perjury, that your notice is accurate and that you are the rights holder or authorized to act on their behalf.',
          ],
        },
        {
          p: 'If your content was removed and you believe this was a mistake, you may submit a counter-notice to the same address with equivalent information. We may remove allegedly infringing content and terminate repeat infringers’ accounts.',
        },
      ],
    },
    {
      heading: '8. Termination',
      blocks: [
        {
          p: 'You may stop using Puzler and delete your account at any time. We may suspend or terminate your access if you violate these Terms or if we discontinue the service. Sections that by their nature should survive termination (including ownership, disclaimers, and limitation of liability) will continue to apply.',
        },
      ],
    },
    {
      heading: '9. Disclaimer of Warranties',
      blocks: [
        {
          p: 'Puzler is provided "as is" and "as available", without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, error-free, or secure.',
        },
      ],
    },
    {
      heading: '10. Limitation of Liability',
      blocks: [
        {
          p: 'To the maximum extent permitted by law, Puzler and its operator will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of the service. Our total liability for any claim relating to the service will not exceed one hundred US dollars (US$100) or the amount you paid us in the twelve months before the claim, whichever is greater. Some jurisdictions do not allow certain limitations, so some of these may not apply to you.',
        },
      ],
    },
    {
      heading: '11. Governing Law',
      blocks: [
        {
          p: 'These Terms are governed by the laws of the State of Florida, United States, without regard to its conflict-of-laws rules. You agree to the exclusive jurisdiction of the state and federal courts located in Florida for any dispute not subject to arbitration or small-claims court, except where prohibited by your local law. If you are a consumer in the EU, EEA, or UK, you retain the protection of mandatory provisions of your country’s law.',
        },
      ],
    },
    {
      heading: '12. Changes to These Terms',
      blocks: [
        {
          p: 'We may update these Terms from time to time. If we make material changes, we will update the "Last updated" date above and, where appropriate, notify you. Your continued use of Puzler after changes take effect constitutes acceptance of the revised Terms.',
        },
      ],
    },
    {
      heading: '13. Contact',
      blocks: [
        { p: ['Questions about these Terms? Contact us at ', SUPPORT, '.'] },
      ],
    },
  ],
}
