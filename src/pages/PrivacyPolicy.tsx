import LegalPageLayout from "@/components/landing/LegalPageLayout";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="March 16, 2026">
      <p>
        This Privacy Policy explains how FitCore collects, uses, and protects information when you use the platform.
        By using the service, you agree to the collection and use of information as described here.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm">
        <li>Account details such as name, email address, and gym name.</li>
        <li>Usage data such as features used, pages visited, and device information.</li>
        <li>Payment-related metadata required to process subscriptions.</li>
        <li>Member data entered by gym owners for service delivery.</li>
      </ul>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">How We Use Information</h2>
      <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm">
        <li>To provide, operate, and improve the FitCore platform.</li>
        <li>To process payments, send reminders, and handle support requests.</li>
        <li>To monitor security, prevent fraud, and enforce policies.</li>
        <li>To generate analytics and insights for gym owners.</li>
      </ul>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Data Sharing</h2>
      <p>
        We do not sell personal information. We may share data with trusted service providers who help us run the
        platform, such as payment processors and hosting providers, and when required by law.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Data Retention</h2>
      <p>
        We retain information as long as necessary to provide the service and comply with legal obligations. Gym owners
        control the retention of their member records within the platform.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Your Rights</h2>
      <p>
        You may request access, correction, or deletion of your personal information. Contact us using the details
        below and we will respond promptly.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Security</h2>
      <p>
        We apply encryption in transit, access controls, and monitoring to protect your information. No system is
        perfectly secure, so we continually improve safeguards.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Contact</h2>
      <p>
        If you have questions about this Privacy Policy, contact us at fitcore3446@gmail.com.
      </p>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
