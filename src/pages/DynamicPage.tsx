import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';

const DynamicPage = () => {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  
  // Get slug from either URL param or pathname
  const slug = paramSlug || location.pathname.replace('/', '');

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <h1 className="text-2xl font-bold">Page Not Found</h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The page you're looking for doesn't exist or is not published.
            </p>
            <Link to="/" className="text-primary hover:underline">
              Return to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(page.content, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 's',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'section'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'align'],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{page.title}</span>
        </nav>

        {/* Page Content */}
        <Card>
          <CardHeader>
            <h1 className="text-4xl font-bold">{page.title}</h1>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              style={{
                fontSize: '1rem',
                lineHeight: '1.75',
              }}
            />
            
            <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center">
          <Link to="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DynamicPage;
