'use client';

import { useState, useMemo } from 'react';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Payment } from '@/lib/types';

interface PaymentTableProps {
    payments: Payment[];
}

export default function PaymentTable({ payments }: PaymentTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const totalPages = useMemo(() => Math.ceil(payments.length / itemsPerPage), [payments]);

    const paginatedPayments = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return payments.slice(start, start + itemsPerPage);
    }, [currentPage, payments]);

    const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    return (
        <div className="w-full">
            <Table className="border rounded-lg">
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{payment.userName}</TableCell>
                            <TableCell>{payment.eventTitle}</TableCell>
                            <TableCell>${payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex justify-end items-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}