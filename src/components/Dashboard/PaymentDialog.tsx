"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { CheckCircle, Clock, Loader2, Copy } from "lucide-react";
import { Organization } from "@/lib/types";

interface Props {
    event: any;
    open: boolean;
    onClose: (paid?: boolean) => void;
}

export function PaymentDialog({ event, open, onClose }: Props) {
    const [method, setMethod] = useState("mpesa");
    const [mpesaCode, setMpesaCode] = useState("");
    const [cashReceivedBy, setCashReceivedBy] = useState("");
    const [isPaying, setIsPaying] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { currentUser } = useApp();
    const qc = useQueryClient();

    const { data: orgData } = useQuery({
        queryKey: ["organization"],
        queryFn: () => api.get<Organization>("/api/organizations"),
        staleTime: 60_000,
        enabled: open,
    });

    const org = orgData as unknown as Organization | undefined;
    const paymentDetails = org?.paymentDetails;

    const handleReset = () => {
        setMpesaCode("");
        setCashReceivedBy("");
        setSubmitted(false);
    };

    const handleClose = (paid?: boolean) => {
        handleReset();
        onClose(paid);
    };

    const handleSubmit = async () => {
        if (method === "mpesa" && !mpesaCode.trim()) {
            toast.error("Please enter your M-Pesa transaction code");
            return;
        }
        if (method === "cash" && !cashReceivedBy.trim()) {
            toast.error("Please enter the name of the leader who received cash");
            return;
        }

        const payload: Record<string, unknown> = {
            eventId: event.id,
            amount: event.price,
            method,
            userId: currentUser?.id,
            userName: currentUser?.name,
        };
        if (method === "mpesa") payload.mpesaCode = mpesaCode.trim().toUpperCase();
        if (method === "cash") payload.cashReceivedBy = cashReceivedBy.trim();

        setIsPaying(true);
        try {
            const result = await api.post<{ paymentStatus: string; message: string }>(
                "/api/payments",
                payload
            );
            await qc.invalidateQueries({ queryKey: ["payments"] });
            await qc.invalidateQueries({ queryKey: ["registrations"] });

            if (result.paymentStatus === "pending_approval") {
                setSubmitted(true);
            } else {
                toast.success("Payment recorded successfully");
                handleClose(true);
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Payment failed");
        } finally {
            setIsPaying(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
    };

    return (
        <Dialog open={open} onOpenChange={() => handleClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay for {event.title}</DialogTitle>
                </DialogHeader>

                {submitted ? (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-5 text-center">
                            <Clock className="h-8 w-8 text-blue-500" />
                            <div>
                                <p className="font-semibold text-blue-800">Payment Submitted</p>
                                <p className="text-sm text-blue-600 mt-1">
                                    Your M-Pesa code has been received and is awaiting approval by a leader.
                                    You&apos;ll be notified once it&apos;s confirmed.
                                </p>
                            </div>
                        </div>
                        <Button className="w-full" onClick={() => handleClose()}>
                            Done
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="font-semibold">KSh {event.price?.toLocaleString()}</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Payment Method</Label>
                            <select
                                className="w-full border rounded-md p-2 bg-background text-sm"
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                            >
                                <option value="mpesa">M-Pesa</option>
                                <option value="cash">Cash</option>
                            </select>
                        </div>

                        {method === "mpesa" && (
                            <>
                                {paymentDetails ? (
                                    <div className="rounded-lg border bg-green-50 border-green-200 p-4 space-y-2">
                                        <p className="text-sm font-semibold text-green-800">
                                            {paymentDetails.type === "till"
                                                ? "Buy Goods (Till Number)"
                                                : paymentDetails.type === "paybill"
                                                ? "Paybill Number"
                                                : "Send Money (Phone Number)"}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xl font-bold text-green-900">
                                                {paymentDetails.number}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyToClipboard(paymentDetails.number)}
                                                className="h-7 text-green-700"
                                            >
                                                <Copy className="h-3.5 w-3.5 mr-1" />
                                                Copy
                                            </Button>
                                        </div>
                                        <p className="text-sm text-green-700">
                                            Business: <span className="font-medium">{paymentDetails.businessName}</span>
                                        </p>
                                        {paymentDetails.accountName && (
                                            <p className="text-sm text-green-700">
                                                Account: <span className="font-medium">{paymentDetails.accountName}</span>
                                            </p>
                                        )}
                                        <p className="text-xs text-green-600 mt-1">
                                            Amount: <strong>KSh {event.price?.toLocaleString()}</strong>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                                        Payment details not configured. Contact your organisation admin.
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <Label>M-Pesa Transaction Code</Label>
                                    <Input
                                        placeholder="e.g. QGH7XKAPLM"
                                        value={mpesaCode}
                                        onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                                        disabled={isPaying}
                                        className="font-mono uppercase"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the code from your M-Pesa confirmation SMS
                                    </p>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleSubmit}
                                    disabled={isPaying || !mpesaCode.trim()}
                                >
                                    {isPaying ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                                    ) : (
                                        <><CheckCircle className="h-4 w-4 mr-2" />Submit Payment Code</>
                                    )}
                                </Button>
                            </>
                        )}

                        {method === "cash" && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Leader who received cash</Label>
                                    <Input
                                        placeholder="Enter leader's name"
                                        value={cashReceivedBy}
                                        onChange={(e) => setCashReceivedBy(e.target.value)}
                                        disabled={isPaying}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleSubmit}
                                    disabled={isPaying || !cashReceivedBy.trim()}
                                >
                                    {isPaying ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording...</>
                                    ) : "Record Cash Payment"}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
