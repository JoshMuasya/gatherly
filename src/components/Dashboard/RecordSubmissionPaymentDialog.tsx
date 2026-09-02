"use client"

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRecordSubmissionPayment } from '@/hooks/useForms';

interface RecordSubmissionPaymentDialogProps {
  formId: string;
  submissionId: string | null;
  currentBalance: number;
  onClose: () => void;
}

export function RecordSubmissionPaymentDialog({
  formId, submissionId, currentBalance, onClose,
}: RecordSubmissionPaymentDialogProps) {
  const [amount, setAmount] = useState(currentBalance > 0 ? String(currentBalance) : '');
  const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
  const [mpesaCode, setMpesaCode] = useState('');
  const [cashReceivedBy, setCashReceivedBy] = useState('');

  const recordPayment = useRecordSubmissionPayment(formId);

  const handleClose = () => {
    setAmount(currentBalance > 0 ? String(currentBalance) : '');
    setMethod('cash');
    setMpesaCode('');
    setCashReceivedBy('');
    onClose();
  };

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    if (method === 'mpesa' && !mpesaCode.trim()) {
      toast.error('Enter the M-Pesa transaction code');
      return;
    }
    if (!submissionId) return;

    try {
      await recordPayment.mutateAsync({
        submissionId,
        amount: numericAmount,
        method,
        mpesaCode: method === 'mpesa' ? mpesaCode.trim().toUpperCase() : undefined,
        cashReceivedBy: method === 'cash' ? cashReceivedBy.trim() || undefined : undefined,
      });
      toast.success('Payment recorded');
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment');
    }
  };

  return (
    <Dialog open={!!submissionId} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">Current balance</span>
            <span className="font-semibold">
              {currentBalance < 0 ? `Overpaid by KSh ${Math.abs(currentBalance).toLocaleString()}` : `KSh ${currentBalance.toLocaleString()}`}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Amount (KSh)</Label>
            <Input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={(v: 'cash' | 'mpesa') => setMethod(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'mpesa' ? (
            <div className="flex flex-col gap-1.5">
              <Label>M-Pesa Transaction Code</Label>
              <Input
                placeholder="e.g. QGH7XKAPLM"
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Received by (optional)</Label>
              <Input
                placeholder="Leader's name"
                value={cashReceivedBy}
                onChange={e => setCashReceivedBy(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
