"use client";

import { Calendar, MapPin, Users as UsersIcon, Edit, Trash2, Loader2, Printer } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Events, UserRole } from "@/lib/types";
import { Progress } from "../ui/progress";

interface EventCardProps {
    event: Events;
    userRole: UserRole
    isRegistered?: boolean
    showAdminActions?: boolean;
    isDeleting?: boolean
    onRegister?: () => void;
    onCancelRegistration?: () => void;
    onPay?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    isPaying?: boolean;
    canPrintTicket?: boolean
    onPrintTicket?: () => void
}

export function EventCard({
    event,
    userRole,
    onRegister,
    isRegistered,
    isDeleting,
    onCancelRegistration,
    showAdminActions,
    onPay,
    onEdit,
    onDelete,
    isPaying,
    canPrintTicket,
    onPrintTicket
}: EventCardProps) {
    const isFree = event.price === 0;
    const isAdminOrLeader =
        showAdminActions &&
        (userRole?.toLowerCase() === "admin" ||
            userRole?.toLowerCase() === "leader" ||
            userRole?.toLowerCase() === "treasurer");

    const attendeesCount = event.attendeesCount ?? 0;

    const progress =
        event.maxAttendees > 0
            ? (attendeesCount / event.maxAttendees) * 100
            : 0;

    return (
        <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in">

            {/* Gradient Strip */}
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary to-secondary" />

            <CardContent className="p-5 pt-6 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-display font-bold text-foreground text-base leading-tight">
                        {event.title}
                    </h3>

                    <Badge
                        variant={isFree ? "secondary" : "default"}
                        className="shrink-0 text-xs"
                    >
                        {isFree ? "Free" : `KSh ${event.price}`}
                    </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.desc}
                </p>

                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>
                            {event.date} at {event.time}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{event.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <UsersIcon className="h-3.5 w-3.5 text-primary" />
                        <span>
                            {attendeesCount} / {event.maxAttendees} attendees
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <Progress value={progress} className="h-2" />
                </div>
            </CardContent>

            <CardFooter className="px-5 pb-5 pt-0 flex gap-2 flex-wrap">

                {/* ADMIN / LEADER CONTROLS */}
                {isAdminOrLeader && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onEdit}
                            className="flex-1"
                        >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onDelete}
                            className="flex-1 flex items-center justify-center gap-1"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </>
                            )}
                        </Button>
                    </>
                )}

                {/* REGISTER BUTTON */}
                {!isRegistered && onRegister && (
                    <Button onClick={onRegister} className="flex-1">
                        Register
                    </Button>
                )}

                {/* REGISTERED USER ACTIONS */}
                {isRegistered && (
                    <>
                        {onCancelRegistration && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={onCancelRegistration}
                                className="flex-1"
                            >
                                Cancel Registration
                            </Button>
                        )}

                        {onPay && !canPrintTicket && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onPay}
                                className="flex-1"
                            >
                                Make Payment
                            </Button>
                        )}

                        {/* Show Print Ticket if canPrintTicket */}
                        {canPrintTicket && onPrintTicket && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onPrintTicket}
                                className="flex-1"
                            >
                                <Printer className="h-4 w-4 mr-1" />
                                Print Ticket
                            </Button>
                        )}
                    </>
                )}

            </CardFooter>
        </Card>
    );
}