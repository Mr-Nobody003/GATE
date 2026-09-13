import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  // Avoid trailing slash in base URL to prevent double slashes when constructing routes
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : 'https://mr-nobody003.github.io/GATE'

  return [
    {
      url: `${baseUrl}`, // The base URL for your dashboard
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/practice`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // Add more URLs here as your app grows
  ]
}
