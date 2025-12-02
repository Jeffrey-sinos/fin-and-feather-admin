
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import Campaigns from "./pages/admin/Campaigns";
import Pages from "./pages/admin/Pages";
import AdminUsers from "./pages/admin/AdminUsers";
import DynamicPage from "./pages/DynamicPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><ProductAnalytics /></ProtectedRoute>} />
            <Route path="/admin/newsletter" element={<ProtectedRoute><Newsletter /></ProtectedRoute>} />
            <Route path="/admin/blog" element={<ProtectedRoute><Blog /></ProtectedRoute>} />
            <Route path="/admin/contacts" element={<ProtectedRoute><ContactSubscribers /></ProtectedRoute>} />
            <Route path="/admin/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/admin/pages" element={<ProtectedRoute><Pages /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            
            {/* Dynamic Public Pages */}
            <Route path="/page/:slug" element={<DynamicPage />} />
            
            {/* Legacy routes */}
            <Route path="/index" element={<Index />} />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
