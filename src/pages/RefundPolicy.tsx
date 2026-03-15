import LegalPageLayout from "@/components/landing/LegalPageLayout";

const RefundPolicy = () => {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated="March 16, 2026">
      <p>
        This Refund Policy outlines how refunds are handled for FitCore subscriptions and services.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Free Trial</h2>
      <p>
        New accounts may be eligible for a free trial. Charges only begin after the trial period ends.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Subscription Refunds</h2>
      <p>
        Subscription fees are billed in advance. Unless required by law, we do not provide refunds for partial
        subscription periods.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Billing Errors</h2>
      <p>
        If you believe you were charged in error, contact us within 7 days of the charge and we will investigate.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Cancellations</h2>
      <p>
        You may cancel your subscription at any time. Access will remain active until the end of the current billing
        period.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Contact</h2>
      <p>
        For refund requests or billing questions, contact us at fitcore3446@gmail.com.
      </p>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
