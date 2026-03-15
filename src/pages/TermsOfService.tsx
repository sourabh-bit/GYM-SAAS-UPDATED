import LegalPageLayout from "@/components/landing/LegalPageLayout";

const TermsOfService = () => {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="March 16, 2026">
      <p>
        These Terms of Service govern your access to and use of FitCore. By creating an account or using the platform,
        you agree to these terms.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for all activity that
        occurs under your account. Provide accurate and current information when registering.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Acceptable Use</h2>
      <ul className="list-disc pl-5 space-y-1 text-[12px] sm:text-sm">
        <li>Do not attempt to access data that does not belong to your gym.</li>
        <li>Do not reverse engineer, disrupt, or overload the platform.</li>
        <li>Do not upload content that is unlawful, harmful, or infringing.</li>
      </ul>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Subscriptions and Billing</h2>
      <p>
        Paid plans are billed on a recurring basis. You authorize us and our payment providers to charge your payment
        method in accordance with your selected plan.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Data Ownership</h2>
      <p>
        Gym owners retain ownership of their member data. You grant FitCore permission to process that data solely to
        provide the service.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Service Availability</h2>
      <p>
        We strive to provide reliable uptime but cannot guarantee uninterrupted service. Maintenance windows and
        unexpected issues may occur.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, FitCore is not liable for indirect, incidental, or consequential damages
        arising from your use of the platform.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the platform after changes become effective
        constitutes acceptance of the new Terms.
      </p>

      <h2 className="font-display text-base sm:text-lg text-foreground font-semibold">Contact</h2>
      <p>
        For questions about these Terms, contact us at fitcore3446@gmail.com.
      </p>
    </LegalPageLayout>
  );
};

export default TermsOfService;
