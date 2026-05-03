import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mozbet.online'
  
  // Rotas principais
  const routes = [
    '',
    '/casino',
    '/slots',
    '/crash-games',
    '/sobre',
    '/ajuda',
    '/termos',
    '/privacidade',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))
 
  return [...routes]
}
