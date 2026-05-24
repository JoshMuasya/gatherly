"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Organization, User, UserRole } from '@/lib/types';
import { toast } from "sonner";
import { useApp } from '@/lib/context/AppContext';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useInviteUser } from '@/hooks/useUsers';
import { api } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';

export function UsersView() {
    const { currentUser } = useApp();
    const [open, setOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", phoneNumber: "", role: "Youth" });
    const [inviteData, setInviteData] = useState({ name: "", email: "", role: "Youth" });
    const [successOpen, setSuccessOpen] = useState(false);
    const [resetLink, setResetLink] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());

    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Owner" || currentUser?.role === "SuperAdmin";

    const { data: orgData } = useQuery({
        queryKey: ['organization'],
        queryFn: () => api.get<Organization>('/api/organizations'),
        staleTime: 60_000,
    });
    const org = orgData as unknown as Organization | null;
    const youthLabel = org?.roleLabels?.Youth || 'Youth';
    const leaderLabel = org?.roleLabels?.Leader || 'Leader';

    const { data: allUsers = [], isLoading } = useUsers();
    // SuperAdmin accounts are platform-level; hide them from org user management
    const users = allUsers.filter(u => u.role !== 'SuperAdmin');
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();
    const inviteUser = useInviteUser();

    const handleAddUser = async () => {
        try {
            const result = await createUser.mutateAsync(newUser);
            setResetLink(result.resetLink);
            setNewUserEmail(result.email);
            setSuccessOpen(true);
            setOpen(false);
            setNewUser({ name: "", email: "", password: "", phoneNumber: "", role: "Youth" });
            toast.success("User created successfully");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to create user");
        }
    };

    const handleInviteUser = async () => {
        try {
            await inviteUser.mutateAsync(inviteData);
            setInviteOpen(false);
            setInviteData({ name: "", email: "", role: "Youth" });
            toast.success(`Invitation sent to ${inviteData.email}`);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Failed to send invitation");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Delete this user?")) return;
        try {
            await deleteUser.mutateAsync(userId);
            toast.success("User deleted");
        } catch {
            toast.error("Failed to delete user");
        }
    };

    const handleUpdateRole = async (userId: string, role: UserRole) => {
        try {
            await updateUser.mutateAsync({ id: userId, role });
            toast.success("Role updated");
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await updateUser.mutateAsync({ id: editingUser.id, name: editingUser.name, phoneNumber: editingUser.phoneNumber, role: editingUser.role });
            toast.success("User updated");
            setEditOpen(false);
        } catch {
            toast.error("Failed to update user");
        }
    };

    const handleSendResetLink = async (userId: string, email: string) => {
        setResettingIds(prev => new Set(prev).add(userId));
        try {
            const result = await api.post<{ resetLink: string }>("/api/users/reset-pass", { email });
            await navigator.clipboard.writeText(result.resetLink);
            toast.success("Reset link copied to clipboard");
        } catch {
            toast.error("Failed to generate reset link");
        } finally {
            setResettingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-bold">Users</h1>
                    <p className="text-muted-foreground">Manage users and assign roles</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        {/* Invite by email */}
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">Invite by Email</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Name</Label>
                                        <Input value={inviteData.name} onChange={e => setInviteData({ ...inviteData, name: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Email</Label>
                                        <Input type="email" value={inviteData.email} onChange={e => setInviteData({ ...inviteData, email: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Role</Label>
                                        <Select value={inviteData.role} onValueChange={v => setInviteData({ ...inviteData, role: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Youth">{youthLabel}</SelectItem>
                                                <SelectItem value="Leader">{leaderLabel}</SelectItem>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleInviteUser} disabled={inviteUser.isPending} className="w-full">
                                        {inviteUser.isPending ? "Sending..." : "Send Invitation"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Create directly */}
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button>Add New User</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Name</Label>
                                        <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Email</Label>
                                        <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Phone Number</Label>
                                        <Input type="tel" value={newUser.phoneNumber} onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })} placeholder="+254712345678" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Temporary Password</Label>
                                        <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Role</Label>
                                        <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Youth">{youthLabel}</SelectItem>
                                                <SelectItem value="Leader">{leaderLabel}</SelectItem>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleAddUser} disabled={createUser.isPending} className="w-full">
                                        {createUser.isPending ? "Creating..." : "Create User"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* Success dialog with reset link */}
                <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                User Created Successfully!
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Account created for:</p>
                                <p className="font-medium text-lg">{newUserEmail}</p>
                            </div>
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm font-medium mb-2">Send this password reset link to the user:</p>
                                <div className="flex gap-2">
                                    <Input value={resetLink} readOnly className="font-mono text-xs" />
                                    <Button onClick={async () => { await navigator.clipboard.writeText(resetLink); toast.success("Copied!"); }} size="icon">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">The user will set their own password when they click this link.</p>
                            </div>
                            <Button onClick={() => setSuccessOpen(false)} className="w-full">Done</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit user dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
                        {editingUser && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label>Name</Label>
                                    <Input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Email</Label>
                                    <Input value={editingUser.email} disabled />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Phone Number</Label>
                                    <Input value={editingUser.phoneNumber || ""} onChange={e => setEditingUser({ ...editingUser, phoneNumber: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Role</Label>
                                    <Select value={editingUser.role} onValueChange={v => setEditingUser({ ...editingUser, role: v as UserRole })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Youth">{youthLabel}</SelectItem>
                                            <SelectItem value="Leader">{leaderLabel}</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleUpdateUser} disabled={updateUser.isPending} className="w-full">
                                    {updateUser.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No users found</TableCell>
                                </TableRow>
                            ) : (
                                users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                                        {user.name?.split(" ").map(n => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <Select value={user.role} onValueChange={role => handleUpdateRole(user.id, role as UserRole)}>
                                                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Youth">{youthLabel}</SelectItem>
                                                    <SelectItem value="Leader">{leaderLabel}</SelectItem>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="icon" onClick={() => { setEditingUser(user); setEditOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="secondary" size="icon" onClick={() => handleSendResetLink(user.id, user.email)} disabled={resettingIds.has(user.id)}>
                                                    {resettingIds.has(user.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(user.id)} disabled={deleteUser.isPending && deleteUser.variables === user.id}>
                                                    {deleteUser.isPending && deleteUser.variables === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
