const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY ?? "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET ?? "";
const SHORTCODE = process.env.MPESA_SHORTCODE ?? "";
const PASSKEY = process.env.MPESA_PASSKEY ?? "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL ?? "";
const BASE_URL = process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

interface AccessTokenResponse {
    access_token: string;
    expires_in: string;
}

async function getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` },
    });
    if (!res.ok) throw new Error("Failed to obtain M-Pesa access token");
    const data = (await res.json()) as AccessTokenResponse;
    return data.access_token;
}

function getTimestamp(): string {
    return new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
}

function getPassword(timestamp: string): string {
    return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
}

export interface STKPushInput {
    phone: string;
    amount: number;
    accountRef: string;
    description: string;
}

export interface STKPushResult {
    merchantRequestId: string;
    checkoutRequestId: string;
    responseDescription: string;
}

export async function initiateStkPush(input: STKPushInput): Promise<STKPushResult> {
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !SHORTCODE || !PASSKEY || !CALLBACK_URL) {
        throw new Error("M-Pesa environment variables are not configured");
    }

    // Normalise phone: 07xxxxxxxx → 2547xxxxxxxx
    const phone = input.phone.replace(/^0/, "254").replace(/^\+/, "");

    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    const body = {
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(input.amount),
        PartyA: phone,
        PartyB: SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: CALLBACK_URL,
        AccountReference: input.accountRef.slice(0, 12),
        TransactionDesc: input.description.slice(0, 13),
    };

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`STK push failed: ${text}`);
    }

    const data = await res.json() as {
        MerchantRequestID: string;
        CheckoutRequestID: string;
        ResponseDescription: string;
    };

    return {
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseDescription: data.ResponseDescription,
    };
}
