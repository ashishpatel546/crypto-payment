# System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRIPE CRYPTO PAYMENT POC                            │
│                         NestJS + TypeORM + SQLite                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT APPS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ EV Charging  │  │   Mobile     │  │   Web App    │  │    Admin     │   │
│  │   Station    │  │     App      │  │              │  │   Dashboard  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                │                   │                  │            │
└─────────┼────────────────┼───────────────────┼──────────────────┼────────────┘
          │                │                   │                  │
          └────────────────┴───────────────────┴──────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REST API LAYER                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PaymentController                              │  │
│  │  POST /api/v1/payment/precheck                                        │  │
│  │  (Validates wallet balance via RPC)                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SessionController                               │  │
│  │  POST /api/v1/session/start    → Creates charging session            │  │
│  │  POST /api/v1/session/stop     → Finalizes & creates payment link    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  PaymentManagementController                           │  │
│  │  GET  /api/v1/payment/link/:id      → Fetch payment link             │  │
│  │  POST /api/v1/payment/recreate-link → Regenerate expired link        │  │
│  │  POST /api/v1/payment/refund        → Process refund (admin)         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    StripeWebhookController                             │  │
│  │  POST /api/v1/stripe/webhook   → Receives Stripe events              │  │
│  │  (Verifies signature, updates payment status)                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
│  ┌────────────────────────┐  ┌────────────────────────┐                    │
│  │   PaymentService       │  │   SessionService       │                    │
│  │  - precheck()          │  │  - startSession()      │                    │
│  │  - RPC validation      │  │  - stopSession()       │                    │
│  └────────────────────────┘  │  - getPaymentLink()    │                    │
│              │                │  - recreateLink()      │                    │
│              ▼                │  - refundPayment()     │                    │
│  ┌────────────────────────┐  └────────────────────────┘                    │
│  │    StripeService       │              │                                  │
│  │  - createPaymentLink() │◄─────────────┘                                  │
│  │  - refundPayment()     │                                                 │
│  │  - verifyWebhook()     │                                                 │
│  │  - precheck() (RPC)    │                                                 │
│  └────────────────────────┘                                                 │
│              │                                                               │
└──────────────┼───────────────────────────────────────────────────────────────┘
               │
               ├─────────────────┬──────────────────┐
               ▼                 ▼                  ▼
┌──────────────────────┐  ┌──────────────┐  ┌──────────────────────┐
│  STRIPE API          │  │ ALCHEMY RPC  │  │  SQLite DATABASE     │
│                      │  │              │  │                      │
│  - Checkout Session  │  │  - Ethereum  │  │  ┌───────────────┐  │
│  - Payment Intent    │  │  - Polygon   │  │  │ charging_     │  │
│  - Refund API        │  │  - USDC Bal  │  │  │ sessions      │  │
│  - Webhook Events    │  │  - Gas Check │  │  └───────────────┘  │
│                      │  │              │  │                      │
│  checkout.stripe.com │  │  RPC Calls   │  │  ┌───────────────┐  │
└──────────────────────┘  └──────────────┘  │  │ payment_      │  │
                                            │  │ links         │  │
                                            │  └───────────────┘  │
                                            │                      │
                                            │  crypto_payments.db  │
                                            └──────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

                              DATA FLOW

┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START SESSION FLOW                                                       │
│     Client → POST /session/start → SessionService → DB                      │
│     Response: { sessionId: "uuid" }                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2. STOP SESSION & CREATE PAYMENT LINK                                       │
│     Client → POST /session/stop → SessionService → StripeService            │
│            → Stripe API (create checkout) → Save to DB                      │
│     Response: { paymentUrl, amount: 0.5, sessionId }                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3. CUSTOMER PAYMENT                                                         │
│     Customer → Opens paymentUrl → Stripe Checkout → Completes Payment      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  4. WEBHOOK UPDATES STATUS                                                   │
│     Stripe → POST /stripe/webhook → StripeWebhookController                │
│            → Verify Signature → Update DB (status: PAID)                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  5. FETCH PAYMENT LINK (OPTIONAL)                                            │
│     Client → GET /payment/link/:sessionId → DB → Response                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  6. RECREATE LINK (IF EXPIRED)                                               │
│     Client → POST /payment/recreate-link → StripeService                   │
│            → Stripe API → Save new link to DB                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  7. REFUND (ADMIN)                                                           │
│     Admin → POST /payment/refund → StripeService                           │
│           → Stripe Refund API → Update DB (status: REFUNDED)               │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

                         DATABASE SCHEMA

┌────────────────────────────────────────────────────────────────────────────┐
│  charging_sessions                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  id (UUID, PK)                                                        │  │
│  │  status (IN_PROGRESS | COMPLETED | CANCELLED)                        │  │
│  │  finalCost (decimal, default: 0)                                     │  │
│  │  metadata (JSON string, nullable)                                    │  │
│  │  createdAt (datetime)                                                │  │
│  │  updatedAt (datetime)                                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    │ 1:N                                     │
│                                    ▼                                         │
│  payment_links                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  id (UUID, PK)                                                        │  │
│  │  sessionId (UUID, FK → charging_sessions.id)                         │  │
│  │  stripeCheckoutSessionId (string, unique)                            │  │
│  │  paymentUrl (text)                                                   │  │
│  │  amount (decimal)                                                    │  │
│  │  status (PENDING | PAID | FAILED | EXPIRED | REFUNDED)              │  │
│  │  expiresAt (datetime)                                                │  │
│  │  stripePaymentIntentId (string, nullable)                            │  │
│  │  metadata (JSON string, nullable)                                    │  │
│  │  createdAt (datetime)                                                │  │
│  │  updatedAt (datetime)                                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

                         MODULE DEPENDENCIES

                    ┌────────────────┐
                    │   AppModule    │
                    └────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐
│ PaymentModule │  │ SessionModule  │  │  StripeModule  │
└───────────────┘  └────────────────┘  └────────────────┘
        │                   │                   │
        │                   └───────┬───────────┘
        │                           │
        └───────────────────────────┘
                    │
                    ▼
            StripeService
            (Shared Service)

═══════════════════════════════════════════════════════════════════════════════

                    TECHNOLOGY STACK

┌─────────────────────────────────────────────────────────────────────────────┐
│  Backend Framework:    NestJS (Node.js)                                     │
│  Language:             TypeScript                                           │
│  Database:             SQLite (POC) / PostgreSQL (Production)               │
│  ORM:                  TypeORM                                              │
│  Payment Gateway:      Stripe                                               │
│  RPC Provider:         Alchemy (Ethereum, Polygon)                          │
│  Blockchain Library:   ethers.js v5                                         │
│  API Documentation:    Swagger/OpenAPI                                      │
│  Validation:           class-validator                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```
