import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mozbet.online'
  
  // Rotas principais e institucionais
  const routes = [
    '',
    '/sobre-nos',
    '/termos-e-condicoes',
    '/politica-de-privacidade',
    '/jogo-responsavel',
    '/jogar/aviator',
    '/jogar/mines',
    '/jogar/plinko',
    '/jogar/taxi-crash',
    '/jogar/fishinator',
    '/jogar/chicken-highway',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : (route.startsWith('/jogar') ? 0.9 : 0.7),
  }))
 
  return [...routes]
}
