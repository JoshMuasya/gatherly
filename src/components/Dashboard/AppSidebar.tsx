'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { SidebarNav } from './SidebarNav';

export function AppSidebar() {
    const { state } = useSidebar();
    const collapsed = state === 'collapsed';

    return (
        <Sidebar collapsible="icon" className="border-r-0">
            <SidebarContent className="bg-[#0F172A] pt-4">
                {!collapsed && (
                    <div className="px-4 pb-4 mb-2 border-b border-sidebar-border">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-[#4F46E5] flex items-center justify-center shrink-0">
                                <span className="text-white font-display font-bold text-base">G</span>
                            </div>
                            <div>
                                <p className="font-display font-bold text-white text-base leading-none">Gatherly</p>
                            </div>
                        </div>
                    </div>
                )}
                <SidebarNav collapsed={collapsed} />
            </SidebarContent>
        </Sidebar>
    );
}