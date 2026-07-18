import type { Charge, ChargeRequest, PaymentGateway } from "./payment-gateway.js";

const chargesByReference = new Map<string, Charge[]>();
let chargeSequence = 0;

export class ClearwaterPayments implements PaymentGateway {
  async charge(input: ChargeRequest): Promise<Charge> {
    await new Promise<void>((resolve) => setTimeout(resolve, 15));

    chargeSequence += 1;
    const charge: Charge = {
      id: `cw_${chargeSequence}`,
      reference: input.reference,
      amountCents: input.amountCents,
      currency: input.currency,
      status: "succeeded",
    };
    const charges = chargesByReference.get(input.reference) ?? [];
    charges.push(charge);
    chargesByReference.set(input.reference, charges);
    return { ...charge };
  }
}

export function getChargesForReference(reference: string): Charge[] {
  return (chargesByReference.get(reference) ?? []).map((charge) => ({ ...charge }));
}

export function resetGatewayLedger(): void {
  chargesByReference.clear();
  chargeSequence = 0;
}
