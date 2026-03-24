"use client"

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { Check, Copy, KeyRound, Pencil, Trash2 } from 'lucide-react';
import { User, UserRole } from '@/lib/types';
import { toast } from "sonner";
import { useApp } from '@/lib/context/AppContext';

export function UsersView() {
    const { currentUser } = useApp()
    const [open, setOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", phoneNumber: "", role: "Youth" as const });
    const [successOpen, setSuccessOpen] = useState(false);
    const [resetLink, setResetLink] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [editOpen, setEditOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)

    const isAdmin = currentUser?.role === "Admin";

    const handleAddUser = async () => {
        if (!isAdmin || !auth.currentUser) return;

        try {
            const idToken = await auth.currentUser.getIdToken();

            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify(newUser),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create user");

            // Show success dialog with reset link
            setResetLink(data.resetLink);
            setNewUserEmail(data.email);
            setSuccessOpen(true);

            toast.success("User created successfully")

            setOpen(false);
            setNewUser({ name: "", email: "", password: "", phoneNumber: "", role: "Youth" });
        } catch (err: any) {
            toast.error("Failed to Add User");
        }
    };

    const copyResetLink = async () => {
        await navigator.clipboard.writeText(resetLink);
        alert("✅ Reset link copied! Paste it in WhatsApp, Email or SMS and send to the user.");
    };

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                const res = await fetch("/api/users", {
                    method: "GET",
                })

                if (!res.ok) {
                    throw new Error("Failed to fetch users")
                }

                const data = await res.json()

                setUsers(data.users)
            } catch (err: any) {
                setError(err.message)
                toast.error("Failed to load users")
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Delete this user?")) return

        try {
            const idToken = await auth.currentUser?.getIdToken()

            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            })

            if (!res.ok) throw new Error()

            setUsers((prev) => prev.filter((u) => u.id !== userId))

            toast.success("User deleted")
        } catch {
            toast.error("Failed to delete user")
        }
    }

    const handleUpdateRole = async (userId: string, role: UserRole) => {
        try {
            const idToken = await auth.currentUser?.getIdToken()

            const res = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ role }),
            })

            if (!res.ok) throw new Error()

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId ? { ...u, role } : u
                )
            )

            toast.success("Role updated")
        } catch {
            toast.error("Failed to update role")
        }
    }

    const handleEditUser = (user: User) => {
        setEditingUser(user)
        setEditOpen(true)
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return

        try {
            const idToken = await auth.currentUser?.getIdToken()

            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    name: editingUser.name,
                    phoneNumber: editingUser.phoneNumber,
                    role: editingUser.role
                }),
            })

            if (!res.ok) throw new Error()

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editingUser.id ? editingUser : u
                )
            )

            toast.success("User updated successfully")
            setEditOpen(false)

        } catch {
            toast.error("Failed to update user")
        }
    }

    // Add functionality to send reset link to email
    const handleSendResetLink = async (email: string) => {
        try {
            const idToken = await auth.currentUser?.getIdToken()

            const res = await fetch(`/api/users/reset-pass`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error()

            await navigator.clipboard.writeText(data.resetLink)

            toast.success("Reset link copied. Send to the user.")
        } catch {
            toast.error("Failed to generate reset link")
        }
    }

    return (
        <div className="space-y-6 w-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-bold">Users</h1>
                    <p className="text-muted-foreground">Manage users and assign roles</p>
                </div>
                {isAdmin && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Add New User</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className='flex flex-col gap-1.5'>
                                    <Label>Name</Label>
                                    <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    <Label>Email</Label>
                                    <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    <Label>Phone Number</Label>
                                    <Input
                                        type="tel"
                                        value={newUser.phoneNumber}
                                        onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                                        placeholder="+254712345678"
                                    />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    <Label>Password</Label>
                                    <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                    <Label>Role</Label>
                                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as any })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Youth">Youth</SelectItem>
                                            <SelectItem value="Leader">Leader</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddUser} className="w-full">Create User</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

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
                                <p className="text-sm font-medium mb-2">Send this link to the user:</p>
                                <div className="flex gap-2">
                                    <Input value={resetLink} readOnly className="font-mono text-xs" />
                                    <Button onClick={copyResetLink} size="icon">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    The user will set their own password when they click the link.
                                </p>
                            </div>

                            <Button onClick={() => setSuccessOpen(false)} className="w-full">
                                Done
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                        </DialogHeader>

                        {editingUser && (
                            <div className="space-y-4">

                                <div className="flex flex-col gap-1.5">
                                    <Label>Name</Label>
                                    <Input
                                        value={editingUser.name}
                                        onChange={(e) =>
                                            setEditingUser({ ...editingUser, name: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Email</Label>
                                    <Input value={editingUser.email} disabled />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Phone Number</Label>
                                    <Input
                                        value={editingUser.phoneNumber || ""}
                                        onChange={(e) =>
                                            setEditingUser({
                                                ...editingUser,
                                                phoneNumber: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Role</Label>

                                    <Select
                                        value={editingUser.role}
                                        onValueChange={(v) =>
                                            setEditingUser({
                                                ...editingUser,
                                                role: v as UserRole
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="Youth">Youth</SelectItem>
                                            <SelectItem value="Leader">Leader</SelectItem>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={handleUpdateUser}
                                    className="w-full"
                                >
                                    Save Changes
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-red-500">
                                        Failed to load users
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="animate-fade-in">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                                        {user.name
                                                            ?.split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-muted-foreground">
                                            {user.email}
                                        </TableCell>

                                        <TableCell>
                                            <Select
                                                value={user.role}
                                                onValueChange={(role) => handleUpdateRole(user.id, role as UserRole)}
                                            >
                                                <SelectTrigger className="w-28 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="Youth">Youth</SelectItem>
                                                    <SelectItem value="Leader">Leader</SelectItem>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell className="text-muted-foreground">
                                            {user.createdAt
                                                ? new Date(user.createdAt).toLocaleDateString()
                                                : "—"}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    onClick={() => handleSendResetLink(user.email)}
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
