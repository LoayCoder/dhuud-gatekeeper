
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { vi } from 'vitest';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar";

// Mock Lucide icons to avoid rendering actual icons in tests
const MockIcon = (props) => <svg {...props} data-testid={props.name || 'mock-icon'} />;
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    const iconNames = [
        'Shield', 'LayoutDashboard', 'FileWarning', 'ClipboardCheck', 'Users', 'Settings',
        'Settings2', 'Building2', 'LogOut', 'ChevronRight', 'UserCircle', 'User',
        'Network', 'Layers', 'FolderTree', 'HelpCircle', 'LifeBuoy', 'CreditCard',
        'Receipt', 'Puzzle', 'FileStack', 'BarChart3', 'ShieldAlert', 'ShieldCheck',
        'FileCog', 'Package', 'List', 'Plus', 'QrCode', 'ClipboardList', 'Menu',
        'Workflow', 'Clock', 'Radio', 'Calendar', 'MapPin', 'Briefcase', 'UserCheck',
        'Route', 'Video', 'FileKey', 'HardHat', 'Map', 'Download', 'Share',
        'CheckCircle2', 'MessageSquare', 'FileText', 'Bell', 'AlertTriangle', 'Globe',
        'Languages', 'GraduationCap', 'BookOpen', 'History', 'Sparkles', 'Trophy', 'Award'
    ];
    const mockedIcons = iconNames.reduce((acc, name) => {
        acc[name] = (props) => <MockIcon {...props} name={name} />;
        return acc;
    }, {});
    return {
        ...actual,
        ...mockedIcons
    };
});

// Mock hooks
const mockMenuItems = [
  { title: 'Dynamic Dashboard', url: '/', icon: 'LayoutDashboard', menuCode: 'dashboard', isActive: true },
  { title: 'Dynamic Settings', url: '/settings', icon: 'Settings', menuCode: 'settings', isActive: false },
];

vi.mock('@/hooks/use-registry-menu', () => ({
  useRegistryMenu: () => ({
    menuItems: mockMenuItems,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en', dir: () => 'ltr' } }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ tenantName: 'Test Tenant', activeSidebarIconUrl: '', isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'test@example.com' }, profile: { full_name: 'Test User', avatar_url: '' } }),
}));

vi.mock('@/hooks/use-menu-access', () => ({
  useMenuAccess: () => ({ canAccess: () => true, isLoading: false }),
}));

vi.mock('@/hooks/use-pwa-install', () => ({
  usePWAInstall: () => ({ isInstalled: false, canPromptNatively: true, promptInstall: vi.fn() }),
}));

vi.mock('@/components/ui/sidebar', async () => {
    const actual = await vi.importActual('@/components/ui/sidebar');
    return {
        ...actual,
        useSidebar: () => ({ isMobile: false, setOpenMobile: vi.fn() }),
    };
});


// Mock complex child components
vi.mock('@/components/notifications', () => ({
  NotificationPopover: () => <div data-testid="notification-popover" />,
}));
vi.mock('@/components/settings', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));


describe('AppSidebar', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  it('renders menu items dynamically from useRegistryMenu hook', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppSidebar />
      </MemoryRouter>
    );

    // Check for titles from the mocked registryMenuItems
    expect(screen.getByText('Dynamic Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Settings')).toBeInTheDocument();

  });
});
