/**
 * Healthcare.gov Content API service
 * Provides access to health articles, glossary terms, and educational content
 */

const HEALTHCARE_GOV_BASE_URL = 'https://www.healthcare.gov';

export interface HealthArticle {
  url: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  date: string;
  excerpt?: string;
  lang: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  related_terms?: string[];
}

export interface HealthcareApiError {
  error: string;
  message: string;
}

/**
 * Fetch health articles from Healthcare.gov
 */
export async function fetchHealthArticles(
  category?: string,
  limit: number = 10
): Promise<HealthArticle[]> {
  try {
    // Healthcare.gov uses a specific pattern for JSON endpoints
    const endpoint = category 
      ? `${HEALTHCARE_GOV_BASE_URL}/api/articles.json?categories=${category}`
      : `${HEALTHCARE_GOV_BASE_URL}/api/articles.json`;

    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch articles: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform and filter articles
    const articles: HealthArticle[] = data.articles
      ?.slice(0, limit)
      .map((article: any) => ({
        url: article.url,
        title: article.title,
        content: article.content,
        categories: article.categories || [],
        tags: article.tags || [],
        date: article.date,
        excerpt: article.excerpt || article.content.substring(0, 200) + '...',
        lang: article.lang || 'en'
      })) || [];

    return articles;
  } catch (error) {
    console.error('Error fetching health articles:', error);
    return [];
  }
}

/**
 * Fetch glossary terms from Healthcare.gov
 */
export async function fetchGlossaryTerms(
  searchTerm?: string
): Promise<GlossaryTerm[]> {
  try {
    const endpoint = `${HEALTHCARE_GOV_BASE_URL}/api/glossary.json`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch glossary: ${response.statusText}`);
    }

    const data = await response.json();
    
    let terms: GlossaryTerm[] = data.glossary || [];
    
    // Filter by search term if provided
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      terms = terms.filter(term => 
        term.term.toLowerCase().includes(search) ||
        term.definition.toLowerCase().includes(search)
      );
    }

    return terms;
  } catch (error) {
    console.error('Error fetching glossary terms:', error);
    return [];
  }
}

/**
 * Fetch specific topic content
 */
export async function fetchTopicContent(
  topic: string
): Promise<HealthArticle | null> {
  try {
    const endpoint = `${HEALTHCARE_GOV_BASE_URL}/${topic}.json`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch topic: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      url: data.url,
      title: data.title,
      content: data.content,
      categories: data.categories || [],
      tags: data.tags || [],
      date: data.date,
      excerpt: data.excerpt,
      lang: data.lang || 'en'
    };
  } catch (error) {
    console.error('Error fetching topic content:', error);
    return null;
  }
}

/**
 * Search Healthcare.gov content
 */
export async function searchHealthContent(
  query: string,
  type: 'articles' | 'glossary' | 'all' = 'all'
): Promise<{
  articles?: HealthArticle[];
  glossary?: GlossaryTerm[];
}> {
  const results: {
    articles?: HealthArticle[];
    glossary?: GlossaryTerm[];
  } = {};

  if (type === 'articles' || type === 'all') {
    const articles = await fetchHealthArticles();
    // Simple search implementation
    results.articles = articles.filter(article =>
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.content.toLowerCase().includes(query.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  if (type === 'glossary' || type === 'all') {
    results.glossary = await fetchGlossaryTerms(query);
  }

  return results;
}

/**
 * Get featured/recommended articles for eldercare
 */
export async function getFeaturedArticles(): Promise<HealthArticle[]> {
  // These are common eldercare-related categories on Healthcare.gov
  const eldercareCategories = [
    'medicare',
    'medicaid',
    'preventive-care',
    'prescription-drugs',
    'caregiving'
  ];

  const allArticles: HealthArticle[] = [];
  
  // Fetch articles from each category
  for (const category of eldercareCategories) {
    const articles = await fetchHealthArticles(category, 2);
    allArticles.push(...articles);
  }

  return allArticles;
}