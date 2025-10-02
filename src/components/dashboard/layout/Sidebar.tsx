
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Package, ShoppingCart, Users, Home, Box, Mail, FileText, MessageSquare, BarChart3, Megaphone, FileEdit } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    title: 'Inventory',
    href: '/admin/inventory',
    icon: Box,
  },
  {
    title: 'Product Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    icon: Users,
  },
  {
    title: 'Campaigns',
    href: '/admin/campaigns',
    icon: Megaphone,
  },
  {
    title: 'Newsletter',
    href: '/admin/newsletter',
    icon: Mail,
  },
  {
    title: 'Blog',
    href: '/admin/blog',
    icon: FileText,
  },
  {
    title: 'Pages',
    href: '/admin/pages',
    icon: FileEdit,
  },
  {
    title: 'Contact Subscribers',
    href: '/admin/contacts',
    icon: MessageSquare,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-16',
        'lg:relative'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          {isOpen && (
            <Link to="/admin" className="text-sidebar-foreground font-bold text-xl">
              Fish & Chick
            </Link>
          )}
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'group flex items-center px-2 py-3 text-sm font-medium rounded-md',
              location.pathname === item.href
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5',
                location.pathname === item.href
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground'
              )}
            />
            {isOpen && <span>{item.title}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
