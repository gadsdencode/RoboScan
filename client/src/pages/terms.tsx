import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Link } from "wouter";

const EFFECTIVE_DATE = "June 8, 2026";

export default function Terms() {
  return (
    <LegalPageLayout
      seoRoute="terms"
      title="Terms of Service"
      effectiveDate={EFFECTIVE_DATE}
    >
      <section>
        <h2>1. Agreement to Terms</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
          of AI BotCheck, operated by Overture Systems Solutions, LLC
          (&ldquo;Overture,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) at{" "}
          <a href="https://www.aibotcheck.io">www.aibotcheck.io</a> (the
          &ldquo;Service&rdquo;). By accessing or using the Service, you agree to
          these Terms and our{" "}
          <Link href="/privacy">
            <a>Privacy Policy</a>
          </Link>
          . If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Description of the Service</h2>
        <p>
          AI BotCheck provides website scanning tools that analyze AI-critical files
          (such as robots.txt and llms.txt), file builders for generating technical
          site files, scan history and comparison features, and optional Guardian
          subscription features including recurring scans and change alerts.
        </p>
      </section>

      <section>
        <h2>3. Account Registration</h2>
        <p>
          Some features require an account. You agree to provide accurate
          information, keep your credentials secure, and notify us promptly of
          unauthorized access. You are responsible for all activity under your
          account. You must be at least 18 years old (or the age of majority in
          your jurisdiction) to create an account.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Scan, probe, or test websites you do not own or have explicit
            authorization to test
          </li>
          <li>Use the Service for any unlawful, harmful, or fraudulent purpose</li>
          <li>
            Attempt to bypass rate limits, access controls, or security measures
          </li>
          <li>
            Reverse engineer, scrape, or systematically extract data from the
            Service except as permitted by law
          </li>
          <li>Interfere with or disrupt the Service or its infrastructure</li>
          <li>Resell or sublicense the Service without our written consent</li>
        </ul>
        <p>
          We may suspend or terminate access for violations of this section or for
          conduct that we reasonably believe harms the Service or other users.
        </p>
      </section>

      <section>
        <h2>5. Scan Results Disclaimer</h2>
        <p>
          Scan reports, scores, grades, and recommendations are provided for
          informational purposes only. We do not guarantee that results are
          complete, accurate, or up to date. Site configurations change frequently;
          you are solely responsible for reviewing, validating, and acting on scan
          results before making production or business decisions.
        </p>
      </section>

      <section>
        <h2>6. Subscriptions and Billing</h2>
        <p>
          Paid features such as the Guardian subscription are billed through Stripe.
          By subscribing, you authorize recurring charges at the then-current rate
          until you cancel. You may manage or cancel your subscription through the
          Stripe Customer Portal or as otherwise made available in the Service.
        </p>
        <p>
          Fees are generally non-refundable except where required by law or at our
          sole discretion. Price changes will be communicated in advance where
          required; continued use after a price change constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>7. Free Tier and Usage Limits</h2>
        <p>
          Free features may be subject to usage limits, feature restrictions, or
          fair-use policies. We may modify free-tier availability at any time with
          or without notice, provided such changes do not retroactively eliminate
          paid features you have already purchased for the current billing period.
        </p>
      </section>

      <section>
        <h2>8. Intellectual Property</h2>
        <p>
          The Service, including its software, design, branding, and documentation,
          is owned by Overture or its licensors and protected by intellectual
          property laws. We grant you a limited, non-exclusive, non-transferable
          license to use the Service for your internal business purposes in
          accordance with these Terms. You retain ownership of URLs, content, and
          data you submit; you grant us a license to process that data solely to
          provide the Service.
        </p>
      </section>

      <section>
        <h2>9. Generated Files</h2>
        <p>
          Files produced by our builders (robots.txt, llms.txt, sitemap.xml, and
          similar outputs) are provided as-is. You are responsible for reviewing,
          customizing, and deploying generated files on your own sites. We are not
          liable for misconfigurations, indexing issues, or compliance failures
          arising from your use of generated files.
        </p>
      </section>

      <section>
        <h2>10. Third-Party Services</h2>
        <p>
          The Service integrates with third-party providers including Stripe
          (payments), Upstash QStash (background job processing), Neon (database
          hosting), and Vercel (hosting). Your use of those services may be subject
          to their separate terms and policies. We are not responsible for
          third-party services outside our reasonable control.
        </p>
      </section>

      <section>
        <h2>11. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
          INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR SECURE.
        </p>
      </section>

      <section>
        <h2>12. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, OVERTURE AND ITS OFFICERS,
          DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR
          TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE
          SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE
          (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
        </p>
      </section>

      <section>
        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Overture from any claims, damages,
          losses, and expenses (including reasonable attorneys&apos; fees) arising
          from your use of the Service, your violation of these Terms, or your
          scanning or testing of websites without proper authorization.
        </p>
      </section>

      <section>
        <h2>14. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate
          your access for breach of these Terms, non-payment, or operational reasons.
          Upon termination, your right to use the Service ceases. Provisions that
          by their nature should survive (including disclaimers, limitations of
          liability, and indemnification) will survive termination.
        </p>
      </section>

      <section>
        <h2>15. Governing Law and Disputes</h2>
        <p>
          These Terms are governed by the laws of the Commonwealth of Virginia,
          without regard to conflict-of-law principles. Any dispute arising from
          these Terms or the Service shall be brought exclusively in the state or
          federal courts located in Virginia, and you consent to personal
          jurisdiction in those courts.
        </p>
      </section>

      <section>
        <h2>16. Changes to These Terms</h2>
        <p>
          We may revise these Terms at any time by posting an updated version on
          this page and updating the effective date. Material changes may be
          communicated through the Service or by email. Your continued use after
          changes become effective constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>17. Contact</h2>
        <p>
          For questions about these Terms, contact Overture Systems Solutions, LLC
          at{" "}
          <a href="mailto:jordan.martens@osscontact.com">
            jordan.martens@osscontact.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
