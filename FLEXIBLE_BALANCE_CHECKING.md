# Flexible Balance Checking Enhancement

## 🎯 Overview

Enhanced the session management system with flexible balance checking to avoid redundant balance verifications and improve performance when the frontend team has already verified user balance using the precheck API.

## 🚀 Key Improvement

Added an optional `checkBalance` flag to the session start API that allows the frontend to:

1. **Skip balance checking** when they've already verified balance using `/api/v1/payment/precheck`
2. **Perform balance checking** when needed (default behavior)
3. **Avoid duplicate database entries** for repeated balance checks

## 📋 API Changes

### Updated: `POST /api/v1/session/start`

#### New Optional Field:

```typescript
{
  checkBalance?: boolean = true  // Default: true (backward compatible)
}
```

#### Conditional Required Fields:

When `checkBalance` is `true` (or omitted), these fields are required:

- `walletAddress`
- `chain`
- `expectedMaxCost`

When `checkBalance` is `false`, these fields are optional.

#### Request Examples:

**1. Traditional approach (with balance check):**

```json
{
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "checkBalance": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c",
  "chain": "ETHEREUM",
  "expectedMaxCost": 10.0
}
```

**2. Optimized approach (FE already checked balance):**

```json
{
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "checkBalance": false,
  "metadata": {
    "precheckVerified": true,
    "precheckTimestamp": "2025-10-13T22:00:00Z"
  }
}
```

#### Response Examples:

**With Balance Check:**

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "balanceCheckId": "456e7890-e89b-12d3-a456-426614174001",
  "balanceStatus": "SUFFICIENT",
  "message": "Charging session started successfully with sufficient balance"
}
```

**Without Balance Check:**

```json
{
  "success": true,
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123",
  "chargerId": "CHARGER-001",
  "message": "Charging session started successfully (balance check skipped)"
}
```

## 🆕 New API Endpoints

### `GET /api/v1/user/recent-balance-check/:userId`

Helps FE determine if a recent balance check exists to avoid redundant verifications.

#### Query Parameters:

- `walletAddress` - User's wallet address
- `chain` - Blockchain network
- `requestedAmount` - Amount to check
- `withinMinutes` - Time window to search (default: 5 minutes)

#### Response Examples:

**Recent Check Found:**

```json
{
  "exists": true,
  "balanceCheck": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userId": "user-123",
    "walletAddress": "0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c",
    "chain": "ETHEREUM",
    "requestedAmount": 10.0,
    "actualBalance": 15.5,
    "status": "SUFFICIENT",
    "createdAt": "2025-10-13T22:00:00.000Z"
  },
  "message": "Recent sufficient balance check found from 2025-10-13T22:00:00.000Z"
}
```

**No Recent Check:**

```json
{
  "exists": false,
  "message": "No recent sufficient balance check found within 5 minutes"
}
```

## 🔄 Recommended Frontend Flow

### Option 1: Optimized Flow (Recommended)

```typescript
// 1. Check for recent balance verification
const recentCheck = await checkRecentBalance(
  userId,
  walletAddress,
  chain,
  amount,
);

if (recentCheck.exists) {
  // Start session without balance check
  const session = await startSession({
    userId,
    chargerId,
    checkBalance: false,
    metadata: {
      recentBalanceCheckId: recentCheck.balanceCheck.id,
    },
  });
} else {
  // Perform precheck first
  const precheck = await precheckBalance(walletAddress, chain, amount);

  if (precheck.canPay) {
    // Start session without additional balance check
    const session = await startSession({
      userId,
      chargerId,
      checkBalance: false,
      metadata: {
        precheckVerified: true,
        precheckTimestamp: new Date().toISOString(),
      },
    });
  } else {
    // Handle insufficient balance
    showInsufficientBalanceError(precheck);
  }
}
```

### Option 2: Traditional Flow (Still Supported)

```typescript
// Start session with balance check (original behavior)
const session = await startSession({
  userId,
  chargerId,
  checkBalance: true, // or omit (defaults to true)
  walletAddress,
  chain,
  expectedMaxCost,
});
```

## 💾 Database Changes

### Session Metadata Enhancement

Sessions now include additional metadata indicating balance check behavior:

```json
{
  "balanceCheckSkipped": false, // true if checkBalance was false
  "balanceCheckId": "uuid", // only if balance check was performed
  "walletAddress": "0x...", // only if balance check was performed
  "chain": "ETHEREUM" // only if balance check was performed
}
```

### Balance Check Table

No schema changes - existing `balance_checks` table continues to work with selective usage.

## 🔒 Validation & Security

### Field Validation

- When `checkBalance: true`: `walletAddress`, `chain`, `expectedMaxCost` are required
- When `checkBalance: false`: These fields are optional
- Custom validation decorator `@ValidateIf` ensures proper conditional validation

### Security Considerations

- Balance checking is **opt-out**, not opt-in (secure by default)
- FE must explicitly set `checkBalance: false` to skip verification
- Session metadata tracks whether balance was verified or skipped
- Audit trail maintained for compliance

## 📊 Benefits

### Performance Improvements

- ✅ Reduces redundant API calls
- ✅ Eliminates duplicate database entries
- ✅ Faster session creation when balance already verified
- ✅ Better user experience with quicker response times

### Developer Experience

- ✅ Backward compatible (existing code works unchanged)
- ✅ Clear API documentation with examples
- ✅ Flexible integration patterns
- ✅ Comprehensive error handling

### Business Value

- ✅ Reduced database storage costs
- ✅ Lower API latency for repeat users
- ✅ Better scalability with high-frequency usage
- ✅ Maintains security and audit compliance

## 🧪 Testing

Run the comprehensive test suite:

```bash
./test-flexible-balance.sh
```

Tests include:

- Traditional session start with balance check
- FE precheck API usage
- Session start without balance check
- Balance check history verification
- Recent balance check lookup
- Error handling for invalid combinations
- Session management with different balance check states

## 📈 Monitoring & Metrics

### Key Metrics to Track

- Balance check skip rate (% of sessions started with `checkBalance: false`)
- API response time improvement for optimized flow
- Database balance_checks table growth rate reduction
- User session success rate comparison between flows

### Log Entries

- Sessions log whether balance check was performed or skipped
- Balance check results continue to be logged when performed
- Metadata tracks optimization decisions for debugging

This enhancement provides significant performance improvements while maintaining security and backward compatibility.
