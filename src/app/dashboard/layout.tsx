'use client';

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Dashboard/AppSidebar";
import { Topbar } from "@/components/Dashboard/topbar";
import { Providers } from "../providers";

export default function DashboardLayout({
    children,
}: { children: React.ReactNode }) {

    return (
        <Providers>
            <SidebarProvider>
                <div className="flex h-screen bg-[#F8FAFC] w-full overflow-hidden">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col overflow-hidden w-full">
                        <Topbar />
                        <main className="flex-1 overflow-y-auto p-8 bg-background">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </Providers>
    );
}