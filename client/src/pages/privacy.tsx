import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Link } from "wouter";

const EFFECTIVE_DATE = "June 8, 2026";

export default function Privacy() {
  return (
    <LegalPageLayout
      seoRoute="privacy"
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
    >
      <section>
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy describes how Overture Systems Solutions, LLC
          (&ldquo;Overture,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) collects, uses, and shares information when you use
          AI BotCheck at{" "}
          <a href="https://www.aibotcheck.io">www.aibotcheck.io</a> (the
          &ldquo;Service&rdquo;). By using the Service, you agree to the
          practices described here. Please also review our{" "}
          <Link href="/terms">
            <a>Terms of Service</a>
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <h3>Account information</h3>
        <p>
          When you register or sign in, we may collect your email address, display
          name, authentication provider identifier, and account preferences.
        </p>
        <h3>Scan and builder data</h3>
        <p>
          When you run a scan or use our file builders, we collect the URLs you
          submit, the resulting scan outputs (such as robots.txt, llms.txt, HTTP
          headers, scores, and related metadata), and any configuration you enter
          in builder tools.
        </p>
        <h3>Subscription and billing data</h3>
        <p>
          If you subscribe to Guardian or make a purchase, payment processing is
          handled by Stripe. We receive subscription status, plan details, and
          limited billing metadata from Stripe — we do not store full payment card
          numbers on our servers.
        </p>
        <h3>Usage and technical data</h3>
        <p>
          We automatically collect information such as IP address, browser type,
          device information, pages visited, timestamps, and referral URLs. We may
          use Vercel Analytics for aggregated page-view metrics.
        </p>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service</li>
          <li>Run website scans and generate reports and builder files</li>
          <li>Store scan history and enable comparison and recurring scan features</li>
          <li>Process subscriptions and manage your account</li>
          <li>Send service-related notifications, including change alerts for recurring scans</li>
          <li>Monitor usage, diagnose problems, and improve performance and security</li>
          <li>Detect, prevent, and address abuse, fraud, or unauthorized access</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>4. Scan Data Handling</h2>
        <p>
          When you submit a URL for scanning, we fetch publicly accessible
          resources from that site to produce your report. You are responsible for
          ensuring you have the right to scan any URL you submit. Scan results are
          stored in association with your account (when signed in) or as otherwise
          described at the time of use. Retention periods may vary by feature and
          account type; scan history for subscribed users is retained until you
          delete it or close your account, subject to backup and legal retention
          requirements.
        </p>
      </section>

      <section>
        <h2>5. Third-Party Service Providers</h2>
        <p>
          We use trusted third parties to operate the Service. They process data on
          our behalf and are contractually required to protect it:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing and subscription management
          </li>
          <li>
            <strong>Upstash QStash</strong> — asynchronous scan job queuing and
            background processing
          </li>
          <li>
            <strong>Neon</strong> — managed PostgreSQL database hosting for account,
            scan, and subscription data
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and infrastructure
          </li>
        </ul>
        <p>
          Each provider&apos;s use of your information is also governed by their own
          privacy policies.
        </p>
      </section>

      <section>
        <h2>6. Cookies and Authentication</h2>
        <p>
          We use an HTTP-only authentication cookie to maintain your signed-in
          session. The cookie contains a signed JSON Web Token (JWT) with a
          defined expiration period. We configure cookies with security attributes
          appropriate for production deployment (including SameSite restrictions).
        </p>
        <p>
          We do not use third-party advertising cookies. Vercel Analytics, if
          enabled, collects lightweight, aggregated usage data and does not use
          cookies for cross-site tracking in the same manner as ad networks.
        </p>
      </section>

      <section>
        <h2>7. How We Share Information</h2>
        <p>We do not sell your personal information. We may share information:</p>
        <ul>
          <li>With service providers listed above, solely to operate the Service</li>
          <li>When required by law, regulation, legal process, or governmental request</li>
          <li>To protect the rights, property, or safety of Overture, our users, or others</li>
          <li>In connection with a merger, acquisition, or sale of assets (with notice where required)</li>
        </ul>
      </section>

      <section>
        <h2>8. Data Retention and Deletion</h2>
        <p>
          We retain personal information for as long as your account is active or as
          needed to provide the Service, comply with legal obligations, resolve
          disputes, and enforce agreements. You may request deletion of your account
          and associated data by contacting us. Deletion may be subject to reasonable
          backup retention periods and legal hold requirements.
        </p>
      </section>

      <section>
        <h2>9. Your Rights and Choices</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete,
          or export your personal information, or to object to or restrict certain
          processing. To exercise these rights, contact us at the email below. We
          will respond within the timeframe required by applicable law. Residents of
          the European Economic Area, United Kingdom, and certain U.S. states may
          have additional rights under local privacy laws.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          We implement reasonable administrative, technical, and organizational
          measures designed to protect your information. No method of transmission
          or storage is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          The Service is not directed to children under 13 (or the minimum age
          required in your jurisdiction). We do not knowingly collect personal
          information from children. If you believe a child has provided us personal
          information, please contact us so we can delete it.
        </p>
      </section>

      <section>
        <h2>12. International Transfers</h2>
        <p>
          We are based in the United States. If you access the Service from outside
          the U.S., your information may be transferred to, stored in, and processed
          in the U.S. and other countries where our service providers operate.
        </p>
      </section>

      <section>
        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the
          revised policy on this page and update the effective date. Material changes
          may be communicated through the Service or by email where appropriate.
          Continued use after changes take effect constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section>
        <h2>14. Contact Us</h2>
        <p>
          For privacy-related questions or requests, contact Overture Systems
          Solutions, LLC at{" "}
          <a href="mailto:jordan.martens@osscontact.com">
            jordan.martens@osscontact.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
