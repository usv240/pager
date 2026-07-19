import type { Order } from "../domain/order.js";
import type { Product } from "../domain/product.js";
import { ClearwaterPayments } from "../gateway/clearwater-payments.js";
import { CartRepository } from "../repos/cart-repository.js";
import { InventoryRepository } from "../repos/inventory-repository.js";
import { OrderRepository } from "../repos/order-repository.js";
import { ProductRepository } from "../repos/product-repository.js";
import { CartService } from "../services/cart-service.js";
import { CatalogService } from "../services/catalog-service.js";
import { CheckoutService } from "../services/checkout-service.js";
import { DiscountService, type Promotion } from "../services/discount-service.js";
import { InventoryService } from "../services/inventory-service.js";
import { OrderService } from "../services/order-service.js";
import { PricingService } from "../services/pricing-service.js";
import { TaxService, type TaxRule } from "../services/tax-service.js";
import { nextId } from "./ids.js";
import { Logger } from "./logger.js";

export const catalogSeed: readonly Product[] = [
  {
    id: "ceramic-mug",
    sku: "HOME-MUG-12",
    name: "Ceramic Studio Mug",
    description: "A twelve-ounce glazed stoneware mug.",
    unitPriceCents: 1899,
    currency: "USD",
    taxable: true,
    active: true,
    category: "home",
  },
  {
    id: "linen-notebook",
    sku: "DESK-NOTE-A5",
    name: "Linen A5 Notebook",
    description: "A ruled notebook with 160 pages and a linen cover.",
    unitPriceCents: 1299,
    currency: "USD",
    taxable: true,
    active: true,
    category: "stationery",
  },
  {
    id: "digital-gift-card",
    sku: "GIFT-DIGITAL-25",
    name: "Digital Gift Card",
    description: "A digital gift card delivered by email.",
    unitPriceCents: 2500,
    currency: "USD",
    taxable: false,
    active: true,
    category: "gift-cards",
  },
  {
    id: "canvas-tote",
    sku: "BAG-TOTE-NAT",
    name: "Natural Canvas Tote",
    description: "A heavyweight cotton carryall with an interior pocket.",
    unitPriceCents: 2199,
    currency: "USD",
    taxable: true,
    active: true,
    category: "accessories",
  },
];

export const promotionSeed: readonly Promotion[] = [
  {
    code: "WELCOME10",
    kind: "percentage",
    basisPoints: 1000,
    minimumSubtotalCents: 2500,
    maximumDiscountCents: 1000,
    startsAt: "2025-01-01T00:00:00.000Z",
    endsAt: "2035-12-31T23:59:59.999Z",
  },
  {
    code: "DESK500",
    kind: "fixed",
    amountCents: 500,
    minimumSubtotalCents: 4000,
    maximumDiscountCents: 500,
    startsAt: "2025-01-01T00:00:00.000Z",
    endsAt: "2035-12-31T23:59:59.999Z",
  },
  {
    code: "SPRING15",
    kind: "percentage",
    basisPoints: 1500,
    minimumSubtotalCents: 3000,
    maximumDiscountCents: 1500,
    startsAt: "2025-03-01T00:00:00.000Z",
    endsAt: "2025-05-31T23:59:59.999Z",
  },
];

export const taxRuleSeed: readonly TaxRule[] = [
  { jurisdiction: "IL", basisPoints: 1025 },
  { jurisdiction: "CA", basisPoints: 725 },
  { jurisdiction: "OR", basisPoints: 0 },
];

export const inventorySeed: Readonly<Record<string, number>> = {
  "ceramic-mug": 12,
  "linen-notebook": 24,
  "digital-gift-card": 40,
  "canvas-tote": 8,
};

export interface ServiceContext {
  carts: CartRepository;
  inventory: InventoryRepository;
  orders: OrderRepository;
  products: ProductRepository;
  payments: ClearwaterPayments;
  logger: Logger;
  cartService: CartService;
  catalogService: CatalogService;
  checkoutService: CheckoutService;
  discountService: DiscountService;
  inventoryService: InventoryService;
  orderService: OrderService;
  pricingService: PricingService;
  taxService: TaxService;
}

export function createServiceContext(): ServiceContext {
  const carts = new CartRepository();
  const inventory = new InventoryRepository();
  const orders = new OrderRepository();
  const products = new ProductRepository();
  const payments = new ClearwaterPayments();
  const logger = new Logger();

  for (const product of catalogSeed) {
    products.create(product);
    inventory.setStock(product.id, inventorySeed[product.id] ?? 0);
  }

  const cartService = new CartService(carts, products);
  const catalogService = new CatalogService(products, inventory);
  const discountService = new DiscountService(promotionSeed);
  const inventoryService = new InventoryService(inventory);
  const orderService = new OrderService(orders);
  const taxService = new TaxService(taxRuleSeed);
  const pricingService = new PricingService(discountService, taxService);
  const checkoutService = new CheckoutService(orders, payments, logger);

  return {
    carts,
    inventory,
    orders,
    products,
    payments,
    logger,
    cartService,
    catalogService,
    checkoutService,
    discountService,
    inventoryService,
    orderService,
    pricingService,
    taxService,
  };
}

export function createPendingPaymentOrder(repository: OrderRepository): Order {
  const id = nextId("order");
  return repository.create({
    id,
    cartId: nextId("cart"),
    status: "pending_payment",
    totalCents: 2599,
    currency: "USD",
    paymentReference: `order_${id}`,
  });
}

export function seedCheckoutOrder(context: ServiceContext): Order {
  const cart = context.cartService.createCart();
  context.cartService.addItem(cart.id, "ceramic-mug", 1);
  const populated = context.cartService.getCart(cart.id);
  const discount = context.discountService.quote(populated.subtotalCents, populated.promotionCode);
  const tax = context.taxService.quote(populated.lines, "IL");
  const quote = context.orderService.quote(populated, discount, tax);
  return context.orderService.createPendingOrder(quote);
}
