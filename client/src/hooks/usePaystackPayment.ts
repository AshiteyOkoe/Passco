import { useCallback, useState } from 'react';
import { initializePayment, verifyPayment, getPaystackPublicKey } from '../services/api';

interface PaystackPopArgs {
  key: string;
  access_code?: string;
  ref?: string;
  email?: string;
  amount?: number;
  currency?: string;
  onSuccess?: (txnRef: string) => void;
  onCancel?: () => void;
}

interface PaystackPopWindow {
  PaystackPop?: {
    setup: (args: PaystackPopArgs) => void;
  };
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as PaystackPopWindow;
    if (w.PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack. Check your connection.'));
    document.body.appendChild(script);
  });
}

interface UsePaystackPaymentOptions {
  onSuccess?: () => void;
}

interface UsePaystackPaymentResult {
  purchase: (planId: string) => Promise<void>;
  purchasing: string | null;
  error: string;
  resumeUrl: string | null;
  clearError: () => void;
  clearResume: () => void;
  reportError: (message: string) => void;
}

export function usePaystackPayment(email?: string, options?: UsePaystackPaymentOptions): UsePaystackPaymentResult {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const clearError = useCallback(() => setError(''), []);
  const clearResume = useCallback(() => setResumeUrl(null), []);
  const reportError = useCallback((message: string) => setError(message), []);

  const purchase = useCallback(
    async (planId: string) => {
      if (!email) return;
      setPurchasing(planId);
      setError('');

      const handleError = (err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response: { data: { message: string } } }).response?.data?.message
            : err instanceof Error
              ? err.message
              : 'Payment failed';
        setError(msg || 'Payment initialization failed');
        setPurchasing(null);
      };

      try {
        const res = await initializePayment({ plan: planId, email });

        if (res.access_code) {
          const { publicKey } = await getPaystackPublicKey();
          if (!publicKey) {
            setError('Paystack is not configured yet. Add PAYSTACK_PUBLIC_KEY to the server .env and restart.');
            setPurchasing(null);
            return;
          }

          await loadPaystackScript();
          const w = window as PaystackPopWindow;
          if (!w.PaystackPop) {
            setResumeUrl(res.authorization_url || null);
            setPurchasing(null);
            return;
          }

          const resetPurchasing = setTimeout(() => setPurchasing(null), 90000);
          const popupFallback = setTimeout(() => {
            clearTimeout(resetPurchasing);
            setResumeUrl(res.authorization_url || null);
            setPurchasing(null);
          }, 12000);

          const teardown = () => {
            clearTimeout(resetPurchasing);
            clearTimeout(popupFallback);
          };

          w.PaystackPop.setup({
            key: publicKey,
            access_code: res.access_code,
            ref: res.reference,
            onSuccess: async (txnRef) => {
              teardown();
              try {
                await verifyPayment(txnRef || res.reference);
                options?.onSuccess?.();
                setPurchasing(null);
              } catch {
                setError('Payment verification failed. Your plan may take a few moments to activate.');
                setPurchasing(null);
              }
            },
            onCancel: () => {
              teardown();
              setPurchasing(null);
            },
          });
          return;
        }

        if (res.authorization_url) {
          window.location.href = res.authorization_url;
          return;
        }

        throw new Error('Could not start the payment');
      } catch (err: unknown) {
        handleError(err);
      }
    },
    [email, options],
  );

  return { purchase, purchasing, error, resumeUrl, clearError, clearResume, reportError };
}