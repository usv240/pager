export interface ChargeRequest {
  reference: string;
  amountCents: number;
  currency: "USD";
}

export interface Charge {
  id: string;
  reference: string;
  amountCents: number;
  currency: "USD";
  status: "succeeded";
}

export interface PaymentGateway {
  charge(input: ChargeRequest): Promise<Charge>;
}
