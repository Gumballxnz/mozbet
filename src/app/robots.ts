import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/perfil/'],
    },
    sitemap: 'https://mozbet.online/sitemap.xml',
  }
}
