'use client';

import { Bell } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';

export function Topbar() {
    return (
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="text-muted-foreground" />
                <div className="hidden sm:flex items-center gap-2 ml-2">
                    <div className="h-8 w-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                        <span className="text-primary-foreground font-display font-bold text-sm">G</span>
                    </div>
                    <span className="font-display font-bold text-lg text-foreground">Gatherly</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
                <UserMenu />
            </div>
        </header>
    );
}