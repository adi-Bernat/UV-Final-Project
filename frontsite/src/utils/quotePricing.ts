
export type PricingMode = "items" | "manual";

export type QuotePricingInput = {
    items: {
        quantity: number;
        unitPrice: number;
    }[];
    vatPercent: number;
    pricingMode?: PricingMode;
    manualPrice?: number | null;
    priceIncludesVat?: boolean;
};

const money = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateQuotePricing(
    quote: QuotePricingInput
) {
    const priceIncludesVat = quote.priceIncludesVat !== false;
    const vatPercent = quote.vatPercent ?? 18;

    let subtotal: number;
    let vatAmount: number;
    let total: number;

    if (quote.pricingMode === "manual") {
        const price = money(quote.manualPrice ?? 0);

        if (priceIncludesVat) {
            subtotal = money(price / (1 + vatPercent / 100));
            vatAmount = money(price - subtotal);
            total = price;
        } else {
            subtotal = price;
            vatAmount = money(subtotal * vatPercent / 100);
            total = money(subtotal + vatAmount);
        }
    } else {
        subtotal = money(
            quote.items.reduce(
                (sum, item) =>
                    sum + item.quantity * item.unitPrice,
                0
            )
        );

        vatAmount = money(subtotal * vatPercent / 100);
        total = money(subtotal + vatAmount);
    }

    return {
        subtotal,
        vatAmount,
        total,
        quotedPrice: priceIncludesVat ? total : subtotal,
    };
}
