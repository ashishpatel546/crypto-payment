# 🔐 User ID Guide - Understanding Authentication Flow

## What is `user_id`?

The `user_id` is **your application's internal identifier** for the user making the payment. It's a string that uniquely identifies a user in your system.

### Examples of `user_id`:

- `"user_123"` - Simple numeric ID
- `"auth0|507f1f77bcf86cd799439011"` - Auth0 user ID
- `"firebase:abc123def456"` - Firebase UID
- `"customer_1234567890"` - Custom customer ID
- UUID: `"550e8400-e29b-41d4-a716-446655440000"`

---

## Where Does `user_id` Come From?

### 🔄 Complete Flow (Mobile App → Backend)

```
┌──────────────────────────────────────────────────────────────┐
│                    1. User Authentication                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    User opens mobile app
                              │
                              ▼
                    User logs in (email/password)
                              │
                              ▼
            Authentication service validates credentials
                              │
                              ▼
        Returns JWT token: { user_id: "user_123", email: "..." }
                              │
                              ▼
              Mobile app stores JWT in secure storage

┌──────────────────────────────────────────────────────────────┐
│              2. EV Charging Session (User Context)            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
        User starts EV charging at station
                              │
                              ▼
        Mobile app knows: user_id = "user_123" (from JWT)
                              │
                              ▼
        User taps "Pay with Crypto"

┌──────────────────────────────────────────────────────────────┐
│                3. Precheck Request (with user_id)             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Mobile app sends:
        POST /api/v1/payment/precheck
        Headers: { Authorization: "Bearer <JWT>" }
        Body: {
          "address": "0x742d35Cc...",
          "chain": "ethereum",
          "user_id": "user_123",  ← Extracted from JWT
          "amount_usd": 25.50
        }
                              │
                              ▼
        Backend validates JWT & extracts user_id
                              │
                              ▼
        Backend checks wallet balance
                              │
                              ▼
        Returns: { canPay: true, ... }

┌──────────────────────────────────────────────────────────────┐
│                4. Payment Creation (Linked to User)           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Charging session ends
                              │
                              ▼
        Mobile app calls:
        POST /api/v1/payment/create
        Body: {
          "provider": "coinbase_cdp",
          "user_id": "user_123",  ← Same user
          "session_id": "charging_789",
          "amount_usd": 25.50,
          ...
        }
                              │
                              ▼
        Backend creates payment & stores:
        - user_id: "user_123"
        - session_id: "charging_789"
        - payment_id: "pay_xyz"
                              │
                              ▼
        Returns payment URL
                              │
                              ▼
        User completes payment
                              │
                              ▼
        Backend webhook receives confirmation
                              │
                              ▼
        Backend updates payment record for user_id "user_123"
```

---

## 🔧 Implementation Examples

### Example 1: Mobile App with JWT

**Mobile App (React Native / Flutter):**

```javascript
// 1. User logs in
const login = async (email, password) => {
  const response = await fetch('https://your-auth-server.com/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const { token, user_id } = await response.json();

  // Store for later use
  await AsyncStorage.setItem('jwt_token', token);
  await AsyncStorage.setItem('user_id', user_id);
};

// 2. When user taps "Pay with Crypto"
const initiatePayment = async (walletAddress, chain, amount) => {
  // Get user_id from storage
  const userId = await AsyncStorage.getItem('user_id');
  const token = await AsyncStorage.getItem('jwt_token');

  // Call precheck
  const response = await fetch(
    'https://your-backend.com/api/v1/payment/precheck?provider=coinbase_cdp',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        address: walletAddress,
        chain: chain,
        user_id: userId, // ← From JWT/storage
        amount_usd: amount,
      }),
    },
  );

  const result = await response.json();
  return result;
};
```

---

### Example 2: Backend Extracts user_id from JWT

**Backend (NestJS with JWT Guard):**

```typescript
// auth.guard.ts - JWT validation
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) return false;

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // { user_id: "user_123", email: "..." }
      return true;
    } catch {
      return false;
    }
  }
}

// payment.controller.ts - Use the guard
@Controller('api/v1/payment')
export class PaymentController {
  @Post('precheck')
  @UseGuards(JwtAuthGuard) // ← Validate JWT first
  async precheck(
    @Body() dto: PrecheckDto,
    @Request() req, // Contains user from JWT
  ) {
    // Option A: Use user_id from JWT (most secure)
    const userId = req.user.user_id;

    // Option B: Use user_id from body (if provided)
    const finalUserId = dto.user_id || userId;

    return this.paymentService.precheck(
      dto.address,
      dto.chain,
      finalUserId,
      dto.amount_usd,
      req.query.provider,
    );
  }
}
```

---

### Example 3: Backend-to-Backend (No User, System Flow)

**Charging Station Management System:**

```typescript
// charging-station-service.ts
class ChargingStationService {
  async onChargingSessionEnd(sessionId: string) {
    // Look up session in database
    const session = await this.db.sessions.findOne({ id: sessionId });

    // Get user_id from session
    const userId = session.user_id; // User who started charging

    // Create payment
    const payment = await fetch(
      'http://payment-gateway/api/v1/payment/create',
      {
        method: 'POST',
        headers: { 'X-API-Key': process.env.INTERNAL_API_KEY },
        body: JSON.stringify({
          provider: 'coinbase_cdp',
          user_id: userId, // ← From session record
          session_id: sessionId,
          amount_usd: session.total_cost,
          chain: session.preferred_chain,
          wallet_address: session.wallet_address,
        }),
      },
    );

    return payment;
  }
}
```

---

## 🎯 Common Scenarios

### Scenario 1: Authenticated User (Production)

```json
POST /api/v1/payment/precheck?provider=coinbase_cdp
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "user_id": "user_123",  ← From JWT or explicitly passed
  "amount_usd": 25.50
}
```

**Backend validates:**

- ✅ JWT is valid
- ✅ `user_id` matches JWT payload OR is explicitly provided
- ✅ User is authorized to make payment

---

### Scenario 2: Anonymous Payment (Testing/POC)

```json
POST /api/v1/payment/precheck?provider=coinbase_cdp

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "amount_usd": 25.50
}
```

**No `user_id` provided:**

- ✅ Payment still works
- ⚠️ Cannot track payment history per user
- ⚠️ Cannot link to user account

---

### Scenario 3: Guest User with Temporary ID

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "user_id": "guest_1696843200_abc123",  ← Temporary ID
  "amount_usd": 25.50
}
```

**Use case:**

- User doesn't have account yet
- Generate temporary ID for tracking
- Can convert to real account later

---

## 📊 Database Schema Example

**How you might store this:**

```sql
-- users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,  -- This is your user_id
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP
);

-- payments table
CREATE TABLE payments (
  payment_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),  -- Links to users.id
  session_id VARCHAR(255),
  amount_usd DECIMAL(10, 2),
  chain VARCHAR(50),
  wallet_address VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- charging_sessions table
CREATE TABLE charging_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),  -- Links to users.id
  charger_id VARCHAR(255),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  energy_kwh DECIMAL(10, 2),
  cost_usd DECIMAL(10, 2),

  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Query Example:**

```sql
-- Get all payments for a user
SELECT * FROM payments WHERE user_id = 'user_123';

-- Get user's payment history with sessions
SELECT
  p.payment_id,
  p.amount_usd,
  p.status,
  cs.charger_id,
  cs.energy_kwh
FROM payments p
JOIN charging_sessions cs ON p.session_id = cs.session_id
WHERE p.user_id = 'user_123'
ORDER BY p.created_at DESC;
```

---

## 🔒 Security Best Practices

### ✅ DO:

1. **Validate JWT before accepting user_id**

   ```typescript
   if (req.user.user_id !== dto.user_id) {
     throw new UnauthorizedException('User ID mismatch');
   }
   ```

2. **Use user_id from JWT (not body) in production**

   ```typescript
   const userId = req.user.user_id; // From validated JWT
   // Don't blindly trust dto.user_id
   ```

3. **Sanitize and validate user_id**

   ```typescript
   if (!/^[a-zA-Z0-9_-]{1,100}$/.test(userId)) {
     throw new BadRequestException('Invalid user_id format');
   }
   ```

4. **Log user_id for audit trails**
   ```typescript
   this.logger.log(`Payment created by user: ${userId}`);
   ```

### ❌ DON'T:

1. ❌ Allow users to set arbitrary `user_id` without validation
2. ❌ Store sensitive data in `user_id` (it's not encrypted)
3. ❌ Use `user_id` as sole authentication (always validate JWT)
4. ❌ Expose internal database IDs directly (use UUIDs)

---

## 🧪 Testing Examples

### Test 1: With user_id

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=coinbase_cdp \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "user_id": "test_user_001",
    "amount_usd": 25.50
  }'
```

### Test 2: Without user_id (anonymous)

```bash
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=stripe \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "polygon",
    "amount_usd": 10.00
  }'
```

---

## 📝 Summary

| Aspect         | Details                                              |
| -------------- | ---------------------------------------------------- |
| **What**       | Unique identifier for the user in your system        |
| **Where from** | JWT token, session, authentication service           |
| **Purpose**    | Link payments to users, track history, audit trail   |
| **Required?**  | Optional in this implementation (good for testing)   |
| **Production** | Should be required + validated against JWT           |
| **Format**     | String (alphanumeric, UUID, or custom format)        |
| **Security**   | Extract from validated JWT, don't trust client input |

---

## 🚀 Next Steps

1. **Add JWT Authentication** (if not already)

   ```bash
   npm install @nestjs/jwt @nestjs/passport passport-jwt
   ```

2. **Add JWT Guard to Payment Endpoints**

   ```typescript
   @UseGuards(JwtAuthGuard)
   @Post('precheck')
   ```

3. **Extract user_id from JWT**

   ```typescript
   const userId = req.user.user_id;
   ```

4. **Add Database Layer** to store payments with user_id

5. **Add User Payment History Endpoint**
   ```typescript
   @Get('history/:user_id')
   async getPaymentHistory(@Param('user_id') userId: string)
   ```

---

**Need help implementing JWT authentication? Let me know!** 🔐
