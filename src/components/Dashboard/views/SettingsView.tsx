"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function SettingsView() {
    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>

            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Settings className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-lg">Settings Coming Soon</h3>
                    <p className="text-muted-foreground mt-2 max-w-md text-sm">
                        Account preferences, notification settings, and organization management will be available here.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
