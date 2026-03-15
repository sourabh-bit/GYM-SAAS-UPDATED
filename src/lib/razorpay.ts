type RazorpayCheckoutOptions = {
  key: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  handler?: (response: Record<string, string>) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

let razorpayLoader: Promise<void> | null = null;

export const loadRazorpay = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayLoader) {
    razorpayLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(script);
    });
  }
  return razorpayLoader;
};

export const openRazorpayCheckout = async (options: RazorpayCheckoutOptions) => {
  await loadRazorpay();
  return new Promise<Record<string, string>>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK not available"));
      return;
    }
    const instance = new window.Razorpay({
      ...options,
      handler: (response: Record<string, string>) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
        ...(options.modal || {}),
      },
    });
    instance.open();
  });
};

export type { RazorpayCheckoutOptions };
