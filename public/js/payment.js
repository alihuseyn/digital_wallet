class PaymentHandler {
    constructor() {
        this.amount = '1.00';
        this.currency = 'USD';
        this.merchantName = 'Example Store';
        this.statusElement = document.getElementById('payment-status');
        
        this.initializeGooglePay();
        this.initializeApplePay();
    }

    // Status display methods
    showStatus(message, isError = false) {
        this.statusElement.textContent = message;
        this.statusElement.className = `payment-status ${isError ? 'error' : 'success'}`;
    }

    // Google Pay implementation
    async initializeGooglePay() {
        const googlePayClient = new google.payments.api.PaymentsClient({
            environment: 'TEST',
        });

        const baseRequest = {
            apiVersion: 2,
            apiVersionMinor: 0
        };

        const baseCardPaymentMethod = {
            type: 'CARD',
            parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['MASTERCARD', 'VISA']
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: 'rapyd',
                    gatewayMerchantId: 'example_merchant_id'
                }
            }
        };

        try {
            const response = await googlePayClient.isReadyToPay({...baseRequest, "allowedPaymentMethods": [baseCardPaymentMethod]});
            console.log('Google Pay readiness:', response);
            if (response.result) {
                console.log('Google Pay is ready to pay!');
                const button = googlePayClient.createButton({onClick: () => this.handleGooglePay(googlePayClient, baseCardPaymentMethod)});
                const container = document.getElementById('google-pay-button');
                container.appendChild(button);
                container.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Google Pay initialization error:', error);
        }
    }

    async handleGooglePay(googlePayClient, baseCardPaymentMethod) {
        const paymentDataRequest = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [baseCardPaymentMethod],
            transactionInfo: {
                totalPriceStatus: 'FINAL',
                totalPrice: this.amount,
                currencyCode: this.currency
            },
            emailRequired: true,
            merchantInfo: {
                merchantName: this.merchantName
            }
        };

        try {
            const paymentData = await googlePayClient.loadPaymentData(paymentDataRequest);
            console.log('Google Pay payment data:', paymentData);
            await this.processPayment('google_pay', paymentData.paymentMethodData.tokenizationData.token);
        } catch (error) {
            console.error('Google Pay payment error:', error);
            this.showStatus('Payment failed. Please try again.', true);
        }
    }

    // Apple Pay implementation
    initializeApplePay() {
        if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
            const button = document.getElementById('apple-pay-button');
            button.classList.remove('hidden');
            button.addEventListener('click', () => this.handleApplePay());
        }
    }

    handleApplePay() {
        const paymentRequest = {
            countryCode: 'US',
            currencyCode: this.currency,
            supportedNetworks: ['visa', 'masterCard'],
            merchantCapabilities: ['supports3DS'],
            total: {
                label: this.merchantName,
                amount: this.amount
            }
        };

        const session = new ApplePaySession(3, paymentRequest);

        session.onvalidatemerchant = async (event) => {
            try {
                const response = await fetch('/api/apple-pay/validate-merchant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ validationURL: event.validationURL })
                });
                const merchantSession = await response.json();
                session.completeMerchantValidation(merchantSession);
            } catch (error) {
                console.error('Merchant validation failed:', error);
                session.abort();
            }
        };

        session.onpaymentauthorized = async (event) => {
            try {
                await this.processPayment('apple_pay', event.payment.token);
                session.completePayment(ApplePaySession.STATUS_SUCCESS);
            } catch (error) {
                console.error('Apple Pay payment error:', error);
                session.completePayment(ApplePaySession.STATUS_FAILURE);
                this.showStatus('Payment failed. Please try again.', true);
            }
        };

        session.begin();
    }

    // Common payment processing
    async processPayment(paymentMethod, token) {
        try {
            const response = await fetch('/api/rapyd/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ paymentMethod, token })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showStatus('Payment successful!');
            } else {
                throw new Error(result.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }
}

// Initialize payment handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PaymentHandler();
});