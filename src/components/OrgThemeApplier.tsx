"use client"

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Organization } from '@/lib/types';
import { auth } from '@/lib/firebase/firebase';
import { useApp } from '@/lib/context/AppContext';

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

const ALL_VARS = [
    '--primary', '--primary-foreground', '--ring', '--chart-1',
    '--secondary', '--secondary-foreground', '--chart-2',
    '--sidebar', '--sidebar-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
];

function hexLuminance(hex: string): number {
    const m = HEX_RE.exec(hex);
    if (!m) return 0.5;
    const r = parseInt(m[1].slice(0, 2), 16) / 255;
    const g = parseInt(m[1].slice(2, 4), 16) / 255;
    const b = parseInt(m[1].slice(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function fgFor(hex: string): string {
    return hexLuminance(hex) > 0.5 ? 'oklch(0.25 0.03 257)' : 'oklch(0.98 0 0)';
}

function resetAll(root: HTMLElement) {
    for (const v of ALL_VARS) root.style.removeProperty(v);
}

export function OrgThemeApplier() {
    const { activeOrgId } = useApp();

    const { data } = useQuery({
        queryKey: ['organization'],
        queryFn: () => api.get<Organization>('/api/organizations'),
        staleTime: 60_000,
        enabled: !!auth.currentUser,
    });

    const org = data as unknown as Organization | null;

    useEffect(() => {
        const root = document.documentElement;
        const primary = org?.primaryColor ?? '';
        const secondary = org?.secondaryColor ?? '';
        const hasPrimary = HEX_RE.test(primary);
        const hasSecondary = HEX_RE.test(secondary);

        resetAll(root);

        if (hasPrimary) {
            const fg = fgFor(primary);
            const isDark = hexLuminance(primary) < 0.5;
            const blendDir = isDark ? 'white' : 'black';

            // App-wide primary
            root.style.setProperty('--primary', primary);
            root.style.setProperty('--primary-foreground', fg);
            root.style.setProperty('--ring', primary);
            root.style.setProperty('--chart-1', primary);

            // Sidebar background theming
            root.style.setProperty('--sidebar', primary);
            root.style.setProperty('--sidebar-foreground', fg);
            // Hover/accent: blend 15% toward white or black for contrast
            root.style.setProperty('--sidebar-accent', `color-mix(in srgb, ${primary}, ${blendDir} 15%)`);
            root.style.setProperty('--sidebar-accent-foreground', fg);
            // Border: slightly darker edge
            root.style.setProperty('--sidebar-border', `color-mix(in srgb, ${primary}, black 20%)`);
            root.style.setProperty('--sidebar-ring', primary);

            // Active nav item: use secondary if available, otherwise blend 25%
            if (!hasSecondary) {
                root.style.setProperty('--sidebar-primary', `color-mix(in srgb, ${primary}, ${blendDir} 25%)`);
                root.style.setProperty('--sidebar-primary-foreground', fg);
            }
        }

        if (hasSecondary) {
            const sfg = fgFor(secondary);
            root.style.setProperty('--secondary', secondary);
            root.style.setProperty('--secondary-foreground', sfg);
            root.style.setProperty('--chart-2', secondary);

            // Secondary drives sidebar active-item highlight
            root.style.setProperty('--sidebar-primary', secondary);
            root.style.setProperty('--sidebar-primary-foreground', sfg);
        }
    }, [org?.primaryColor, org?.secondaryColor]);

    // Clear all overrides when the active org changes so stale colors don't flash
    useEffect(() => {
        return () => resetAll(document.documentElement);
    }, [activeOrgId]);

    return null;
}
