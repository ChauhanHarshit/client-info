// Meta tag management for better link previews
export interface MetaTagConfig {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export function updateMetaTags(config: MetaTagConfig) {
  // Update document title
  if (config.title) {
    document.title = config.title;
  }

  // Update or create meta tags
  const metaTags = [
    { name: 'description', content: config.description },
    { property: 'og:title', content: config.ogTitle || config.title },
    { property: 'og:description', content: config.ogDescription || config.description },
    { property: 'og:url', content: config.ogUrl },
    { property: 'og:image', content: config.ogImage },
    { name: 'twitter:title', content: config.twitterTitle || config.title },
    { name: 'twitter:description', content: config.twitterDescription || config.description },
    { name: 'twitter:image', content: config.twitterImage || config.ogImage }
  ];

  metaTags.forEach(({ name, property, content }) => {
    if (!content) return;

    const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
    let metaTag = document.querySelector(selector) as HTMLMetaElement;

    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (name) metaTag.name = name;
      if (property) metaTag.setAttribute('property', property);
      document.head.appendChild(metaTag);
    }

    metaTag.content = content;
  });
}

// Predefined meta configurations for different pages
export const META_CONFIGS = {
  help: {
    title: 'Help & Support',
    description: 'Find answers to common questions and get help with our platform',
    ogTitle: 'Help & Support',
    ogDescription: 'Find answers to common questions and get help with our platform',
    ogUrl: 'https://tastyyyy.com/help',
    ogImage: 'https://tastyyyy.com/tasty-share-background.png',
    twitterTitle: 'Help & Support',
    twitterDescription: 'Find answers to common questions and get help with our platform',
    twitterImage: 'https://tastyyyy.com/tasty-share-background.png'
  },
  default: {
    title: 'CRM Dashboard',
    description: 'CRM Dashboard for managing content creators and inspiration pages',
    ogTitle: 'CRM Dashboard',
    ogDescription: 'CRM Dashboard for managing content creators and inspiration pages',
    ogUrl: 'https://tastyyyy.com',
    ogImage: 'https://tastyyyy.com/tasty-share-background.png',
    twitterTitle: 'CRM Dashboard',
    twitterDescription: 'CRM Dashboard for managing content creators and inspiration pages',
    twitterImage: 'https://tastyyyy.com/tasty-share-background.png'
  }
};