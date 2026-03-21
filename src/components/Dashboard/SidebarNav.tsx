'use client';

import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { navByRole } from '@/lib/navigation/navigation';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar';
import { useApp } from '@/lib/context/AppContext';

interface Props {
    collapsed: boolean;
}

export function SidebarNav({ collapsed }: Props) {
    const { currentUser, activeSection, setActiveSection } = useApp();
    const role = currentUser?.role as UserRole;
    const items = navByRole[role] || navByRole.Youth;

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-white/50 text-[10px] uppercase tracking-widest font-semibold px-4">
                Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                    onClick={() => setActiveSection(item.id)}
                                    className={cn(
                                        'mx-2 rounded-lg transition-all duration-200',
                                        isActive
                                            ? 'bg-[#4F46E5] w-5/6 text-sidebar-primary-foreground shadow-md'
                                            : 'text-white w-5/6 hover:bg-sidebar-accent'
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    {!collapsed && <span className="font-medium">{item.title}</span>}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}