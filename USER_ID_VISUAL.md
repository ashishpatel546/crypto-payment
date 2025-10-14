# 🎯 user_id - Visual Explanation

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                      YOUR EV CHARGING APP                        │
│                                                                  │
│  User Database:                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id          │ email              │ name          │ ...   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ user_123    │ john@example.com   │ John Doe      │       │  │
│  │ user_456    │ jane@example.com   │ Jane Smith    │       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↑                                       │
│                          │ This is your user_id                 │
└─────────────────────────────────────────────────────────────────┘
```

## How It Flows

```
┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Authentication                                               │
└──────────────────────────────────────────────────────────────────────────┘

    📱 Mobile App                     🔐 Auth Server

    User enters credentials
    (email: john@example.com)
         │
         ├──────────────────────────────►
         │     POST /login              │
         │                              │
         │                          Validates
         │                          credentials
         │                              │
         │                          Looks up user
         │                          in database
         │                              │
         │                          id = "user_123"
         │                              │
         │     JWT Token                │
         │◄────────────────────────────┤
         │  { user_id: "user_123" }     │
         │
    Stores JWT
    in secure storage


┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 2: EV Charging Session                                               │
└──────────────────────────────────────────────────────────────────────────┘

    📱 Mobile App knows:
    - user_id: "user_123" (from JWT)
    - User is: John Doe

    User starts charging → Session created

    Session ID: "session_789"
    User: "user_123"
    Charger: "station_A1"


┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Payment Precheck                                                  │
└──────────────────────────────────────────────────────────────────────────┘

    📱 Mobile App                     💳 Payment Gateway

    User taps "Pay with Crypto"
         │
    Extract user_id from JWT
    user_id = "user_123"
         │
         ├──────────────────────────────►
         │  POST /payment/precheck      │
         │  {                           │
         │    "user_id": "user_123",    │  ← This links payment to John
         │    "address": "0x742...",    │
         │    "amount_usd": 25.50       │
         │  }                           │
         │                              │
         │                          Checks balance
         │                              │
         │     { canPay: true }         │
         │◄────────────────────────────┤


┌──────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Payment Creation & Tracking                                       │
└──────────────────────────────────────────────────────────────────────────┘

    Payment Gateway creates payment:

    ┌─────────────────────────────────────────────┐
    │ Payment Record in Database                  │
    ├─────────────────────────────────────────────┤
    │ payment_id:   "pay_xyz"                     │
    │ user_id:      "user_123"  ← Links to John   │
    │ session_id:   "session_789"                 │
    │ amount:       $25.50                        │
    │ status:       "pending"                     │
    │ created_at:   2025-10-10 16:30:00          │
    └─────────────────────────────────────────────┘

    Now you can:
    ✅ Find all payments by John: WHERE user_id = "user_123"
    ✅ Show John his payment history
    ✅ Process refunds to the correct user
    ✅ Send notifications to John
    ✅ Generate reports per user
```

## Real World Analogy

Think of `user_id` like a **customer account number**:

```
🏪 Coffee Shop Example:

Without user_id (Anonymous):
  Customer walks in → Orders coffee → Pays → Leaves
  ❌ Can't track purchase history
  ❌ Can't offer loyalty rewards
  ❌ Can't handle refunds easily

With user_id (Tracked):
  Customer: John Doe (Account #123)
  Orders coffee → System records: Account #123 purchased coffee
  ✅ "John, you've bought 10 coffees!"
  ✅ "John, here's a free coffee (reward)"
  ✅ "John needs a refund for order #789"
  ✅ "John's favorite is latte"
```

## Your EV Charging System

```
WITHOUT user_id:
  Payment received from wallet 0x742d35...
  ❌ Who paid? Unknown
  ❌ Which user account? Unknown
  ❌ Payment history? Can't link
  ❌ Refund? Don't know who to credit

WITH user_id:
  Payment received from wallet 0x742d35... by user_123 (John Doe)
  ✅ John paid $25.50 for session_789
  ✅ John's 5th payment this month
  ✅ John's total spent: $127.50
  ✅ Issue refund to John's account
  ✅ Send receipt to john@example.com
```

## Code Flow

### Mobile App (React Native)

```javascript
// 1. User logs in
async function login(email, password) {
  const response = await fetch('https://auth.yourapp.com/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  // data = { token: "eyJhbGc...", user_id: "user_123" }

  await AsyncStorage.setItem('jwt', data.token);
  await AsyncStorage.setItem('user_id', data.user_id);
}

// 2. User pays
async function payForCharging(sessionId, amount) {
  const userId = await AsyncStorage.getItem('user_id'); // "user_123"
  const jwt = await AsyncStorage.getItem('jwt');

  const response = await fetch('https://api.yourapp.com/payment/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'coinbase_cdp',
      user_id: userId, // ← From login
      session_id: sessionId,
      amount_usd: amount,
      // ...
    }),
  });

  const payment = await response.json();
  return payment.payment_url; // Open in browser
}
```

### Backend (NestJS)

```typescript
// payment.service.ts
async createPayment(
  provider: string,
  userId: string,           // ← Received from mobile app
  sessionId: string,
  amount: number,
  // ...
) {
  // 1. Create payment with provider (Coinbase/Stripe)
  const payment = await this.coinbaseService.createPayment(...);

  // 2. Store in database with user_id
  await this.db.payments.insert({
    payment_id: payment.id,
    user_id: userId,        // ← Link to user!
    session_id: sessionId,
    amount_usd: amount,
    status: 'pending',
    created_at: new Date(),
  });

  // 3. Can now query: "Get all payments for user_123"
  const userPayments = await this.db.payments.find({
    where: { user_id: userId }
  });

  return payment;
}
```

## Summary Diagram

```
┌─────────────┐
│   user_id   │ = Unique identifier for the USER in your system
└─────────────┘
      │
      ├─ From: Your authentication system (JWT/OAuth/Database)
      ├─ Used: To link payments to user accounts
      ├─ Format: String (any format you choose)
      ├─ Examples: "user_123", "auth0|abc", UUID
      │
      ├─ Benefits:
      │   ✅ Track payment history
      │   ✅ User dashboard
      │   ✅ Refunds & support
      │   ✅ Compliance & audit
      │
      └─ In this API:
          • Optional (for testing flexibility)
          • Recommended (for production)
          • Defaults to "anonymous" if not provided
```

---

## 📖 More Resources

- **USER_ID_GUIDE.md** - Complete documentation with code examples
- **USER_ID_QUICK_REF.md** - Quick reference card
- **Swagger UI** - http://localhost:3000/api/docs (interactive testing)
