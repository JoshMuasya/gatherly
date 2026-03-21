"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";

interface Props {
    event: any;
    open: boolean;
    onClose: (paid?: boolean) => void;
}

export function PaymentDialog({ event, open, onClose }: Props) {
    const [method, setMethod] = useState("mpesa");
    const [mpesaCode, setMpesaCode] = useState("");
    const [cashReceivedBy, setCashReceivedBy] = useState("");
    const { currentUser } = useApp(); 

    const handlePayment = async () => {
        const payload: any = {
            eventId: event.id,
            amount: event.price,
            method,
            userId: currentUser?.id,       
            userName: currentUser?.name, 
        };

        if (method === "mpesa") payload.mpesaCode = mpesaCode;
        if (method === "cash") payload.cashReceivedBy = cashReceivedBy;

        const res = await fetch("/api/payments", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            onClose(true); // <- notify parent that payment succeeded
        } else {
            // handle error
            const err = await res.json();
            alert(err.error || "Payment failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay for {event.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">

                    <Input value={`KSh ${event.price}`} disabled />

                    <select
                        className="w-full border rounded-md p-2"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    >
                        <option value="mpesa">Mpesa</option>
                        <option value="cash">Cash</option>
                    </select>

                    {method === "mpesa" && (
                        <Input
                            placeholder="Enter Mpesa Code"
                            value={mpesaCode}
                            onChange={(e) => setMpesaCode(e.target.value)}
                        />
                    )}

                    {method === "cash" && (
                        <Input
                            placeholder="Name of leader who received cash"
                            value={cashReceivedBy}
                            onChange={(e) => setCashReceivedBy(e.target.value)}
                        />
                    )}

                    <Button className="w-full" onClick={handlePayment}>
                        Confirm Payment
                    </Button>

                </div>
            </DialogContent>
        </Dialog>
    );
}