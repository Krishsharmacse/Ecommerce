export type CreatePaymentOrderInput = {
  amountPaise: number;
  receipt: string;
};

export type CreatePaymentOrderResult = {
  providerOrderId: string;
  amountPaise: number;
  currency: string;
};

export type VerifyPaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export type VerifyPaymentResult = {
  valid: boolean;
};

export type RefundInput = {
  paymentId: string;
  amountPaise: number;
  receipt: string;
};

export type RefundResult = {
  providerRefundId: string;
};

export interface PaymentProvider {
  createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  refund(input: RefundInput): Promise<RefundResult>;
}