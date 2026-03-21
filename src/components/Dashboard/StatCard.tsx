import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    variant?: 'default' | 'primary' | 'accent' | 'secondary';
}

const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    secondary: 'bg-secondary/10 text-secondary',
};

export function StatCard({ title, value, icon: Icon, change, variant = 'default' }: StatCardProps) {
    return (
        <Card className="animate-fade-in hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">{title}</p>
                        <p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p>
                        {change && (
                            <p className="text-xs text-accent font-medium mt-1">{change}</p>
                        )}
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${variantStyles[variant]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
