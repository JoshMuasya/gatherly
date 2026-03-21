"use client"

import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function ReportsView() {
    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Reports</h1>
                <p className="text-muted-foreground mt-1">Analytics and insights</p>
            </div>

            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <BarChart3 className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-lg">Reports Coming Soon</h3>
                    <p className="text-muted-foreground mt-2 max-w-md text-sm">
                        Detailed analytics with charts, event performance metrics, and attendance trends will be available here.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
