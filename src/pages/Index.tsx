
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Lake Victoria Aquaculture</CardTitle>
          <CardDescription>
            Admin Dashboard Access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to the Lake Victoria Aquaculture management system.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/auth">Access Admin Dashboard</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Administrator credentials required
            </p>
          </div>
          
          <div className="pt-6 border-t space-y-2">
            <p className="text-sm font-medium">Information</p>
            <div className="flex flex-wrap gap-2 justify-center text-xs">
              <Link to="/faq" className="text-primary hover:underline">
                FAQs
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/terms" className="text-primary hover:underline">
                Terms & Conditions
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/shipping" className="text-primary hover:underline">
                Shipping Policy
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/returns" className="text-primary hover:underline">
                Returns & Refunds
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
