
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin routes
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import Inventory from "./pages/admin/Inventory";
import Newsletter from "./pages/admin/Newsletter";
import Blog from "./pages/admin/Blog";
import ContactSubscribers from "./pages/admin/ContactSubscribers";
import ProductAnalytics from "./pages/admin/ProductAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/analytics" element={<ProductAnalytics />} />
          <Route path="/admin/newsletter" element={<Newsletter />} />
          <Route path="/admin/blog" element={<Blog />} />
          <Route path="/admin/contacts" element={<ContactSubscribers />} />
          
          {/* Legacy routes */}
          <Route path="/index" element={<Index />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
