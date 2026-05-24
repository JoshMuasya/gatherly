"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/lib/context/AppContext';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { auth as firebaseAuth } from '@/lib/firebase/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Building2, Lock, User } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Organization } from '@/lib/types';

type Tab = 'profile' | 'organization' | 'security';

export function SettingsView() {
    const { currentUser } = useApp();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    // Leader+ can access org tab (for colors); Admin/Owner/SuperAdmin can edit full details
    const canAccessOrgTab = ['Leader', 'Admin', 'Owner', 'SuperAdmin'].includes(currentUser?.role ?? '');
    const canEditOrgDetails = ['Admin', 'Owner', 'SuperAdmin'].includes(currentUser?.role ?? '');

    // Profile form state
    const [profileForm, setProfileForm] = useState({ name: currentUser?.name ?? '', phoneNumber: currentUser?.phoneNumber ?? '' });
    const [savingProfile, setSavingProfile] = useState(false);

    // Org form state
    const [orgForm, setOrgForm] = useState({
        name: '',
        logoUrl: '',
        primaryColor: '',
        secondaryColor: '',
        youthLabel: '',
        leaderLabel: '',
        paymentType: 'till' as 'till' | 'paybill' | 'phone',
        paymentNumber: '',
        paymentBusinessName: '',
        paymentAccountName: '',
        whatsappNotifyNumber: '',
    });
    const [savingOrg, setSavingOrg] = useState(false);

    // Security form state
    const [secForm, setSecForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [savingSec, setSavingSec] = useState(false);

    const { data: orgData, isLoading: loadingOrg } = useQuery({
        queryKey: ['organization'],
        queryFn: () => api.get<Organization>('/api/organizations'),
        enabled: canAccessOrgTab,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!orgData) return;
        const org = orgData as unknown as Organization;
        setOrgForm(prev => ({
            name: prev.name || org.name || '',
            logoUrl: prev.logoUrl || org.logoUrl || '',
            primaryColor: prev.primaryColor || org.primaryColor || '',
            secondaryColor: prev.secondaryColor || org.secondaryColor || '',
            youthLabel: prev.youthLabel || org.roleLabels?.Youth || '',
            leaderLabel: prev.leaderLabel || org.roleLabels?.Leader || '',
            paymentType: prev.paymentType || org.paymentDetails?.type || 'till',
            paymentNumber: prev.paymentNumber || org.paymentDetails?.number || '',
            paymentBusinessName: prev.paymentBusinessName || org.paymentDetails?.businessName || '',
            paymentAccountName: prev.paymentAccountName || org.paymentDetails?.accountName || '',
            whatsappNotifyNumber: prev.whatsappNotifyNumber || org.whatsappNotifyNumber || '',
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgData]);

    const handleSaveProfile = async () => {
        if (!currentUser) return;
        setSavingProfile(true);
        try {
            await api.patch(`/api/users/${currentUser.id}`, {
                name: profileForm.name,
                phoneNumber: profileForm.phoneNumber,
            });
            toast.success('Profile updated');
            qc.invalidateQueries({ queryKey: ['users'] });
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSaveOrg = async () => {
        setSavingOrg(true);
        try {
            const payload: Record<string, unknown> = {
                primaryColor: orgForm.primaryColor || undefined,
                secondaryColor: orgForm.secondaryColor || undefined,
            };

            if (canEditOrgDetails) {
                if (orgForm.name) payload.name = orgForm.name;
                if (orgForm.logoUrl) payload.logoUrl = orgForm.logoUrl;
                payload.roleLabels = {
                    Youth: orgForm.youthLabel || 'Youth',
                    Leader: orgForm.leaderLabel || 'Leader',
                };
                if (orgForm.paymentNumber) {
                    payload.paymentDetails = {
                        type: orgForm.paymentType,
                        number: orgForm.paymentNumber,
                        businessName: orgForm.paymentBusinessName,
                        ...(orgForm.paymentAccountName ? { accountName: orgForm.paymentAccountName } : {}),
                    };
                }
                payload.whatsappNotifyNumber = orgForm.whatsappNotifyNumber || "";
            }

            await api.patch('/api/organizations', payload);
            toast.success('Organisation settings saved');
            qc.invalidateQueries({ queryKey: ['organization'] });
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to update organisation');
        } finally {
            setSavingOrg(false);
        }
    };

    const handleChangePassword = async () => {
        if (secForm.newPassword !== secForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (secForm.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        const user = firebaseAuth.currentUser;
        if (!user || !user.email) { toast.error('Not authenticated'); return; }

        setSavingSec(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, secForm.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, secForm.newPassword);
            setSecForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password updated successfully');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to update password';
            toast.error(msg.includes('wrong-password') || msg.includes('invalid-credential')
                ? 'Current password is incorrect'
                : msg);
        } finally {
            setSavingSec(false);
        }
    };

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Profile', icon: User },
        ...(canAccessOrgTab ? [{ id: 'organization' as Tab, label: 'Organisation', icon: Building2 }] : []),
        { id: 'security', label: 'Security', icon: Lock },
    ];

    return (
        <div className="space-y-6 w-full max-w-2xl">
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 border-b">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Profile tab */}
            {activeTab === 'profile' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Profile Information</CardTitle>
                        <CardDescription>Update your name and contact details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Full Name</Label>
                            <Input
                                value={profileForm.name}
                                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="Your name"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Email</Label>
                            <Input value={currentUser?.email ?? ''} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Phone Number</Label>
                            <Input
                                value={profileForm.phoneNumber}
                                onChange={e => setProfileForm(p => ({ ...p, phoneNumber: e.target.value }))}
                                placeholder="+254712345678"
                                type="tel"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Role</Label>
                            <Input value={currentUser?.role ?? ''} disabled className="bg-muted capitalize" />
                        </div>
                        <Separator />
                        <Button onClick={handleSaveProfile} disabled={savingProfile}>
                            {savingProfile ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Organisation tab */}
            {activeTab === 'organization' && canAccessOrgTab && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Organisation Settings</CardTitle>
                        <CardDescription>
                            {canEditOrgDetails
                                ? "Update your organisation's branding, colours, and role labels"
                                : "Update your organisation's colours"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingOrg ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : (
                            <>
                                {/* Full org details — Admin/Owner/SuperAdmin only */}
                                {canEditOrgDetails && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Organisation Name</Label>
                                            <Input
                                                value={orgForm.name}
                                                onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. My Youth Group"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Logo URL</Label>
                                            <Input
                                                value={orgForm.logoUrl}
                                                onChange={e => setOrgForm(p => ({ ...p, logoUrl: e.target.value }))}
                                                placeholder="https://example.com/logo.png"
                                                type="url"
                                            />
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Colours — Leader and above */}
                                <div>
                                    <p className="text-sm font-medium mb-3">Brand Colours</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Primary Colour</Label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="color"
                                                    value={orgForm.primaryColor || '#2563eb'}
                                                    onChange={e => setOrgForm(p => ({ ...p, primaryColor: e.target.value }))}
                                                    className="h-10 w-12 rounded border cursor-pointer"
                                                />
                                                <Input
                                                    value={orgForm.primaryColor}
                                                    onChange={e => setOrgForm(p => ({ ...p, primaryColor: e.target.value }))}
                                                    placeholder="#2563eb"
                                                    className="font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label>Secondary Colour</Label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="color"
                                                    value={orgForm.secondaryColor || '#64748b'}
                                                    onChange={e => setOrgForm(p => ({ ...p, secondaryColor: e.target.value }))}
                                                    className="h-10 w-12 rounded border cursor-pointer"
                                                />
                                                <Input
                                                    value={orgForm.secondaryColor}
                                                    onChange={e => setOrgForm(p => ({ ...p, secondaryColor: e.target.value }))}
                                                    placeholder="#64748b"
                                                    className="font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Role Labels — Admin/Owner/SuperAdmin only */}
                                {canEditOrgDetails && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium mb-1">Role Labels</p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Customise how roles are displayed to users in your organisation (e.g. &quot;Member&quot; instead of &quot;Youth&quot;).
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <Label>Base member label</Label>
                                                    <Input
                                                        value={orgForm.youthLabel}
                                                        onChange={e => setOrgForm(p => ({ ...p, youthLabel: e.target.value }))}
                                                        placeholder="Youth"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Default: Youth</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <Label>Leader label</Label>
                                                    <Input
                                                        value={orgForm.leaderLabel}
                                                        onChange={e => setOrgForm(p => ({ ...p, leaderLabel: e.target.value }))}
                                                        placeholder="Leader"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Default: Leader</p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Payment Details — Admin/Owner/SuperAdmin only */}
                                {canEditOrgDetails && (
                                    <>
                                        <Separator />
                                        <div>
                                                <p className="text-sm font-medium mb-1">M-Pesa Payment Details</p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                These details are shown to members when they pay for events.
                                            </p>
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <Label>Payment Type</Label>
                                                    <select
                                                        className="w-full border rounded-md p-2 bg-background text-sm"
                                                        value={orgForm.paymentType}
                                                        onChange={e => setOrgForm(p => ({ ...p, paymentType: e.target.value as 'till' | 'paybill' | 'phone' }))}
                                                    >
                                                        <option value="till">Buy Goods (Till Number)</option>
                                                        <option value="paybill">Paybill</option>
                                                        <option value="phone">Phone Number (Send Money)</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <Label>{orgForm.paymentType === 'till' ? 'Till Number' : orgForm.paymentType === 'paybill' ? 'Paybill Number' : 'Phone Number'}</Label>
                                                    <Input
                                                        value={orgForm.paymentNumber}
                                                        onChange={e => setOrgForm(p => ({ ...p, paymentNumber: e.target.value }))}
                                                        placeholder="e.g. 123456"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <Label>Business / Store Name</Label>
                                                    <Input
                                                        value={orgForm.paymentBusinessName}
                                                        onChange={e => setOrgForm(p => ({ ...p, paymentBusinessName: e.target.value }))}
                                                        placeholder="e.g. Youth Group Events"
                                                    />
                                                </div>
                                                {orgForm.paymentType === 'paybill' && (

                                                    <div className="flex flex-col gap-1.5">
                                                        <Label>Account Name / Reference</Label>
                                                        <Input
                                                            value={orgForm.paymentAccountName}
                                                            onChange={e => setOrgForm(p => ({ ...p, paymentAccountName: e.target.value }))}
                                                            placeholder="e.g. EVENTS"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* WhatsApp Notification Number — Admin/Owner/SuperAdmin only */}
                                {canEditOrgDetails && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium mb-1">WhatsApp Notification Number</p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                This number receives a WhatsApp message whenever a member submits an M-Pesa code awaiting approval (e.g. the treasurer&apos;s number).
                                            </p>
                                            <div className="flex flex-col gap-1.5">
                                                <Label>Phone Number</Label>
                                                <Input
                                                    value={orgForm.whatsappNotifyNumber}
                                                    onChange={e => setOrgForm(p => ({ ...p, whatsappNotifyNumber: e.target.value }))}
                                                    placeholder="+254712345678"
                                                    type="tel"
                                                />
                                                <p className="text-xs text-muted-foreground">Include country code, e.g. +254712345678</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />
                                <Button onClick={handleSaveOrg} disabled={savingOrg}>
                                    {savingOrg ? 'Saving...' : 'Save Organisation Settings'}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Security tab */}
            {activeTab === 'security' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Change Password</CardTitle>
                        <CardDescription>Enter your current password and choose a new one</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Current Password</Label>
                            <Input
                                type="password"
                                value={secForm.currentPassword}
                                onChange={e => setSecForm(p => ({ ...p, currentPassword: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={secForm.newPassword}
                                onChange={e => setSecForm(p => ({ ...p, newPassword: e.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Confirm New Password</Label>
                            <Input
                                type="password"
                                value={secForm.confirmPassword}
                                onChange={e => setSecForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            />
                        </div>
                        <Separator />
                        <Button onClick={handleChangePassword} disabled={savingSec || !secForm.currentPassword || !secForm.newPassword}>
                            {savingSec ? 'Updating...' : 'Update Password'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
