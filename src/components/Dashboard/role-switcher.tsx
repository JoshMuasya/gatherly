'use client';

import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context/AppContext';
import { UserRole } from '@/lib/types';

export function RoleSwitcher() {
    const { currentUser, switchRole } = useApp();

    const roles: UserRole[] = ['Admin', 'Leader', 'Youth'];

    return (
        <div className="hidden md:flex items-center gap-1">
            {roles.map((role) => (
                <Button
                    key={role}
                    variant={currentUser.role === role ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs capitalize"
                    onClick={() => switchRole(role)}
                >
                    {role}
                </Button>
            ))}
        </div>
    );
}