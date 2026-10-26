const SITE = 'https://focalyst.online';

export const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Focalyst by Chintan',
  alternateName: ['Focalyst', 'Chintan'],
  url: SITE,
  logo: `${SITE}/small-logo.png`,
  email: 'contactfocalyst@gmail.com',
  slogan: 'Productivity and Mindful Living',
  founder: { '@type': 'Person', name: 'Sohan Tamang', jobTitle: 'Founder and CEO' },
  address: { '@type': 'PostalAddress', addressLocality: 'Kolkata', addressRegion: 'West Bengal', addressCountry: 'IN' },
  sameAs: [
    'https://x.com/focalystapp?s=11',
    'https://www.instagram.com/focalyst.online',
    'https://apps.apple.com/app/focalyst-ai-productivity-hub/id6774425442',
    'https://play.google.com/store/apps/details?id=online.focalyst',
    'https://www.linkedin.com/in/chintanshop/',
    'https://www.linkedin.com/in/storiesbysohan/',
    'https://www.linkedin.com/in/focalyst/',
  ],
};

export const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: 'Focalyst',
  url: SITE,
  publisher: { '@id': `${SITE}/#organization` },
};

const offer = (name: string, price: string, currency: 'USD' | 'INR') => ({
  '@type': 'Offer',
  name,
  price,
  priceCurrency: currency,
  url: `${SITE}/pricing`,
});

export const SOFTWARE_APP = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE}/#app`,
  name: 'Focalyst',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web, iOS, Android',
  url: SITE,
  description:
    'Focalyst is an all-in-one productivity app for planning, deep focus and habits, with tasks, a Pomodoro focus timer, habit streaks, accountability groups, notes, voice notes and Focalyst AI.',
  publisher: { '@id': `${SITE}/#organization` },
  offers: [
    offer('Free', '0', 'USD'),
    offer('Pro Monthly', '4.99', 'USD'),
    offer('Pro Yearly', '39.99', 'USD'),
    offer('Lifetime', '99.99', 'USD'),
    offer('Pro Monthly (India)', '99', 'INR'),
    offer('Pro Yearly (India)', '999', 'INR'),
    offer('Lifetime (India)', '2999', 'INR'),
  ],
};

export const breadcrumb = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE}${it.path}`,
  })),
});
