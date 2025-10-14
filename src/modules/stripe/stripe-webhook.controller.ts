import {
  Controller,
  Post,
  Get,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from './stripe.service';
import {
  PaymentLink,
  PaymentStatus,
} from '../session/entities/payment-link.entity';
import type { Response } from 'express';

@ApiTags('Stripe Webhooks')
@Controller('api/v1/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectRepository(PaymentLink)
    private readonly paymentLinkRepository: Repository<PaymentLink>,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook receiver',
    description:
      'Receives and processes webhook events from Stripe. Verifies the webhook signature and updates payment status accordingly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or payload',
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      this.logger.error('Missing Stripe signature');
      return { error: 'Missing signature' };
    }

    try {
      // The raw body is now available directly as a Buffer
      if (!rawBody) {
        this.logger.error('Missing raw body for signature verification');
        return { error: 'Missing raw body' };
      }

      // Construct and verify the event
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
      );

      this.logger.log(`Processing event type: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event.data.object);
          break;
        // Removed payment_intent.succeeded to avoid duplicate processing
        // since checkout.session.completed already handles successful payments
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      return { error: 'Webhook processing failed', message: error.message };
    }
  }

  private async handleCheckoutSessionCompleted(session: any): Promise<void> {
    this.logger.log(`Checkout session completed: ${session.id}`);

    try {
      // Extract session details for better logging
      const sessionId = session.metadata?.session_id;
      const userId = session.metadata?.userId;
      const paymentStatus = session.payment_status;
      const amountTotal = session.amount_total;
      const currency = session.currency;

      this.logger.log(
        `Processing payment for session: ${sessionId}, user: ${userId}, amount: ${amountTotal} ${currency}, status: ${paymentStatus}`,
      );

      // Update payment status in database directly
      await this.updatePaymentStatus(session.id, PaymentStatus.PAID, {
        stripeSessionData: session,
        paymentMethod: session.payment_method_types,
        customerEmail:
          session.customer_details?.email || session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        sessionId: sessionId,
        userId: userId,
        completedAt: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Payment status updated to PAID for session: ${session.id} (Internal session: ${sessionId})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to update payment status for session ${session.id}:`,
        error,
      );
    }
  }

  private async handleCheckoutSessionExpired(session: any): Promise<void> {
    this.logger.log(`Checkout session expired: ${session.id}`);

    try {
      // Update payment status in database directly
      await this.updatePaymentStatus(session.id, PaymentStatus.EXPIRED, {
        stripeSessionData: session,
        expiredAt: new Date().toISOString(),
      });

      this.logger.log(
        `Payment status updated to EXPIRED for session: ${session.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update payment status for expired session ${session.id}:`,
        error,
      );
    }
  }

  private async updatePaymentStatus(
    checkoutSessionId: string,
    status: PaymentStatus,
    metadata?: any,
  ): Promise<void> {
    this.logger.log(
      `Updating payment status for checkout session: ${checkoutSessionId} to ${status}`,
    );

    const paymentLink = await this.paymentLinkRepository.findOne({
      where: { stripeCheckoutSessionId: checkoutSessionId },
    });

    if (!paymentLink) {
      this.logger.warn(
        `Payment link not found for checkout session: ${checkoutSessionId}`,
      );
      return;
    }

    paymentLink.status = status;
    if (metadata) {
      paymentLink.metadata = JSON.stringify(metadata);
    }

    await this.paymentLinkRepository.save(paymentLink);
    this.logger.log(`Payment status updated successfully`);
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: any,
  ): Promise<void> {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);

    try {
      // Find the checkout session by payment intent and update status
      // Note: This might require additional logic to find the session
      this.logger.log(
        `Payment processing completed for payment intent: ${paymentIntent.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process payment intent success: ${paymentIntent.id}:`,
        error,
      );
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`);

    try {
      // Additional logic to handle failed payments can be added here
      this.logger.log(`Payment failed for payment intent: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to process payment intent failure: ${paymentIntent.id}:`,
        error,
      );
    }
  }

  private async handleChargeRefunded(charge: any): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}`);

    try {
      // Additional logic to handle refunds can be added here
      this.logger.log(`Refund processed for charge: ${charge.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to process charge refund: ${charge.id}:`,
        error,
      );
    }
  }

  // Success URL endpoint
  @Get('success')
  @ApiOperation({
    summary: 'Payment success page',
    description: 'Displays a success page after successful payment completion',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'Stripe checkout session ID',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment success page displayed',
  })
  async paymentSuccess(
    @Query('session_id') sessionId?: string,
    @Res() res?: Response,
  ) {
    this.logger.log(
      `Payment success page accessed${sessionId ? ` for session: ${sessionId}` : ''}`,
    );

    // If sessionId is provided, try to find the internal session ID
    let internalSessionId = sessionId;
    let paymentDetails: {
      internalSessionId: string;
      stripeSessionId: string;
      amount: number;
      status: string;
      userId: string;
    } | null = null;

    if (sessionId) {
      try {
        // Find the payment link to get the internal session ID
        const paymentLink = await this.paymentLinkRepository.findOne({
          where: { stripeCheckoutSessionId: sessionId },
          relations: ['session'],
        });

        if (paymentLink) {
          internalSessionId = paymentLink.sessionId;
          paymentDetails = {
            internalSessionId: paymentLink.sessionId,
            stripeSessionId: sessionId,
            amount: paymentLink.amount,
            status: paymentLink.status,
            userId: paymentLink.session?.userId,
          };
          this.logger.log(
            `Found internal session: ${internalSessionId} for Stripe session: ${sessionId}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not find internal session for Stripe session: ${sessionId}`,
          error,
        );
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - Blink Charging</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
        }
        .success-icon {
            width: 80px;
            height: 80px;
            background: #10B981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .checkmark {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        h1 {
            color: #1F2937;
            margin-bottom: 16px;
            font-size: 28px;
            font-weight: 600;
        }
        p {
            color: #6B7280;
            margin-bottom: 20px;
            font-size: 16px;
            line-height: 1.5;
        }
        .session-info {
            background: #F3F4F6;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: left;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: 500;
            color: #374151;
        }
        .info-value {
            color: #6B7280;
            font-family: monospace;
        }
        .btn {
            background: #3B82F6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #2563EB;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #9CA3AF;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">
            <svg class="checkmark" viewBox="0 0 52 52">
                <path d="M14,27 L22,35 L38,19"></path>
            </svg>
        </div>
        
        <h1>Payment Successful!</h1>
        <p>Thank you for your payment. Your EV charging session has been paid for successfully.</p>
        
        ${
          paymentDetails
            ? `
        <div class="session-info">
            <div class="info-row">
                <span class="info-label">Session ID:</span>
                <span class="info-value">${paymentDetails.internalSessionId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">User ID:</span>
                <span class="info-value">${paymentDetails.userId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Amount:</span>
                <span class="info-value">$${paymentDetails.amount}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">${paymentDetails.status} ✅</span>
            </div>
            <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">Stripe</span>
            </div>
        </div>
        `
            : sessionId
              ? `
        <div class="session-info">
            <div class="info-row">
                <span class="info-label">Stripe Session ID:</span>
                <span class="info-value">${sessionId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">Paid ✅</span>
            </div>
            <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">Stripe</span>
            </div>
        </div>
        `
              : ''
        }
        
        <p>You can now close this window or return to the Blink Charging app.</p>
        
        <button class="btn" onclick="closeWindow()">Close Window</button>
        
        <div class="footer">
            <p>Powered by Blink Charging Network</p>
            <p>Questions? Contact support at support@blinkcharging.com</p>
        </div>
    </div>

    <script>
        function closeWindow() {
            // Try multiple methods to close the window
            if (window.opener) {
                // If opened by another window, close it
                window.close();
            } else {
                // Try to close the window first
                window.close();
                
                // If that doesn't work, show a simple message after a delay
                setTimeout(() => {
                    // Check if window is still open by trying to access a property
                    try {
                        if (document.body) {
                            // Replace the content with a simple close message
                            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; font-family: Arial, sans-serif;"><div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"><h2 style="color: #10b981; margin-bottom: 16px;">Payment Complete</h2><p style="color: #6b7280; margin-bottom: 20px;">You can now safely close this tab manually.</p><p style="color: #9ca3af; font-size: 14px;">Use Ctrl+W (Windows/Linux) or Cmd+W (Mac) to close this tab.</p></div></div>';
                        }
                    } catch (e) {
                        // If we can't modify the page, just show an alert
                        alert('Payment completed successfully! Please close this tab manually.');
                    }
                }, 500);
            }
        }
        
        // Auto-close after 60 seconds with warning
        let autoCloseTimer = 60;
        const timerElement = document.createElement('div');
        timerElement.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #f59e0b; color: white; padding: 8px 12px; border-radius: 6px; font-size: 12px; z-index: 1000;';
        document.body.appendChild(timerElement);
        
        const updateTimer = () => {
            timerElement.textContent = 'Auto-close in ' + autoCloseTimer + 's';
            if (autoCloseTimer <= 0) {
                closeWindow();
            } else {
                autoCloseTimer--;
                setTimeout(updateTimer, 1000);
            }
        };
        
        updateTimer();
    </script>
</body>
</html>`;

    if (res) {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
    return { success: true, message: 'Payment successful' };
  }

  // Cancel URL endpoint
  @Get('cancel')
  @ApiOperation({
    summary: 'Payment cancel page',
    description: 'Displays a cancel page when payment is cancelled by user',
  })
  @ApiQuery({
    name: 'session_id',
    description: 'Stripe checkout session ID',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment cancel page displayed',
  })
  async paymentCancel(
    @Query('session_id') sessionId?: string,
    @Res() res?: Response,
  ) {
    this.logger.log(
      `Payment cancel page accessed${sessionId ? ` for session: ${sessionId}` : ''}`,
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Cancelled - Blink Charging</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
        }
        .cancel-icon {
            width: 80px;
            height: 80px;
            background: #EF4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .x-mark {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        h1 {
            color: #1F2937;
            margin-bottom: 16px;
            font-size: 28px;
            font-weight: 600;
        }
        p {
            color: #6B7280;
            margin-bottom: 20px;
            font-size: 16px;
            line-height: 1.5;
        }
        .session-info {
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: left;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: 500;
            color: #374151;
        }
        .info-value {
            color: #6B7280;
            font-family: monospace;
        }
        .btn {
            background: #3B82F6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #2563EB;
        }
        .btn-secondary {
            background: #6B7280;
        }
        .btn-secondary:hover {
            background: #4B5563;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #9CA3AF;
        }
        .warning {
            background: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #92400E;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="cancel-icon">
            <svg class="x-mark" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </div>
        
        <h1>Payment Cancelled</h1>
        <p>Your payment has been cancelled. No charges were made to your account.</p>
        
        ${
          sessionId
            ? `
        <div class="session-info">
            <div class="info-row">
                <span class="info-label">Session ID:</span>
                <span class="info-value">${sessionId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">Payment Cancelled ❌</span>
            </div>
        </div>
        `
            : ''
        }
        
        <div class="warning">
            <strong>Important:</strong> Your charging session may still be active. You'll need to complete payment to avoid any potential issues.
        </div>
        
        <p>Would you like to try again or return to the app?</p>
        
        <button class="btn" onclick="history.back()">Try Again</button>
        <button class="btn btn-secondary" onclick="window.close()">Close Window</button>
        
        <div class="footer">
            <p>Powered by Blink Charging Network</p>
            <p>Questions? Contact support at support@blinkcharging.com</p>
        </div>
    </div>

    <script>
        // Auto-close after 60 seconds
        setTimeout(function() {
            window.close();
        }, 60000);
    </script>
</body>
</html>`;

    if (res) {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
    return { success: true, message: 'Payment cancelled' };
  }
}
