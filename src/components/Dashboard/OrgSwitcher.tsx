'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { api } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
    const { currentUser, activeOrgId, userOrgs, switchOrg, loadingOrgs } = useApp();
    const qc = useQueryClient();

    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({ name: '' });
    const [creating, setCreating] = useState(false);

    const canCreateOrg =
        currentUser?.role === 'SuperAdmin' ||
        currentUser?.role === 'Owner' ||
        currentUser?.role === 'Admin';

    // Don't render if user only has one org and can't create more
    if (!canCreateOrg && userOrgs.length <= 1) return null;

    const activeOrg = userOrgs.find(o => o.id === activeOrgId) ?? userOrgs[0];

    const handleSwitch = (orgId: string) => {
        if (orgId === activeOrgId) { setOpen(false); return; }
        switchOrg(orgId);
        qc.invalidateQueries();
        setOpen(false);
        toast.success(`Switched to ${userOrgs.find(o => o.id === orgId)?.name ?? 'organisation'}`);
    };

    const handleCreateOrg = async () => {
        if (!newOrg.name.trim()) return;
        setCreating(true);
        try {
            const result = await api.post<{ id: string; name: string }>('/api/organizations', {
                name: newOrg.name.trim(),
            });
            // Switch to the newly created org
            switchOrg(result.id);
            toast.success(`Organisation "${newOrg.name}" created`);
            setCreateOpen(false);
            setNewOrg({ name: '' });
            // Reload orgs list
            qc.invalidateQueries({ queryKey: ['organizations'] });
            // Reload the page context
            window.location.reload();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create organisation');
        } finally {
            setCreating(false);
        }
    };

    if (collapsed) {
        return (
            <div className="px-2 pb-2">
                <button
                    onClick={() => setOpen(true)}
                    className="w-full h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title={activeOrg?.name ?? 'Switch organisation'}
                >
                    <Building2 className="h-4 w-4 text-white/80" />
                </button>
                <OrgDropdown
                    open={open}
                    onClose={() => setOpen(false)}
                    userOrgs={userOrgs}
                    activeOrgId={activeOrgId}
                    onSelect={handleSwitch}
                    canCreate={canCreateOrg}
                    onCreateClick={() => { setOpen(false); setCreateOpen(true); }}
                    loadingOrgs={loadingOrgs}
                />
                <CreateOrgDialog
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    value={newOrg.name}
                    onChange={v => setNewOrg({ name: v })}
                    onSubmit={handleCreateOrg}
                    creating={creating}
                />
            </div>
        );
    }

    return (
        <div className="px-3 pb-3 relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-white/60 shrink-0" />
                    <span className="text-white text-sm font-medium truncate">
                        {loadingOrgs ? '…' : (activeOrg?.name ?? 'No organisation')}
                    </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-white/60 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <OrgDropdown
                open={open}
                onClose={() => setOpen(false)}
                userOrgs={userOrgs}
                activeOrgId={activeOrgId}
                onSelect={handleSwitch}
                canCreate={canCreateOrg}
                onCreateClick={() => { setOpen(false); setCreateOpen(true); }}
                loadingOrgs={loadingOrgs}
            />

            <CreateOrgDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                value={newOrg.name}
                onChange={v => setNewOrg({ name: v })}
                onSubmit={handleCreateOrg}
                creating={creating}
            />
        </div>
    );
}

// ─── Dropdown list ────────────────────────────────────────────────────────────

function OrgDropdown({
    open, onClose, userOrgs, activeOrgId, onSelect, canCreate, onCreateClick, loadingOrgs,
}: {
    open: boolean;
    onClose: () => void;
    userOrgs: ReturnType<typeof useApp>['userOrgs'];
    activeOrgId: string | null;
    onSelect: (id: string) => void;
    canCreate: boolean;
    onCreateClick: () => void;
    loadingOrgs: boolean;
}) {
    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {loadingOrgs ? (
                    <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                    </div>
                ) : userOrgs.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No organisations found</p>
                ) : (
                    <div className="py-1 max-h-56 overflow-y-auto">
                        {userOrgs.map(org => (
                            <button
                                key={org.id}
                                onClick={() => onSelect(org.id)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium truncate text-foreground">{org.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{org.role}</p>
                                </div>
                                {org.id === activeOrgId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                        ))}
                    </div>
                )}
                {canCreate && (
                    <>
                        <div className="border-t border-border" />
                        <button
                            onClick={onCreateClick}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-muted transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" /> Create New Organisation
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

// ─── Create org dialog ────────────────────────────────────────────────────────

function CreateOrgDialog({
    open, onClose, value, onChange, onSubmit, creating,
}: {
    open: boolean;
    onClose: () => void;
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    creating: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Create New Organisation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="flex flex-col gap-1.5">
                        <Label>Organisation Name</Label>
                        <Input
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            placeholder="e.g. My Youth Group"
                            onKeyDown={e => e.key === 'Enter' && !creating && onSubmit()}
                            autoFocus
                        />
                    </div>
                    <Button onClick={onSubmit} disabled={creating || !value.trim()} className="w-full">
                        {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : 'Create Organisation'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
