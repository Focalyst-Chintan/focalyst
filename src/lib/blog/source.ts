export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  tags: string[];
  publishedAt: string;
  readingMinutes: number;
  contentMd?: string;
}

export async function getPosts(): Promise<BlogPost[]> {
  return [];
}
