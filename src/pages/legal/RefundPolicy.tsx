import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "overview", number: "1", title: "Overview" },
  { id: "free-tier", number: "2", title: "Free Tier" },
  { id: "paid-subscriptions", number: "3", title: "Paid Subscriptions" },
  { id: "refund-eligibility", number: "4", title: "Refund Eligibility" },
  { id: "refund-process", number: "5", title: "Refund Process" },
  { id: "cancellation", number: "6", title: "Cancellation" },
  { id: "non-refundable", number: "7", title: "Non-Refundable Items" },
  { id: "contact", number: "8", title: "Contact Us" },
];

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      titleAr="سياسة الاسترداد والإلغاء"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          This policy explains how refunds and cancellations work for Dhuuus subscriptions. 
          We aim to be fair and transparent in all billing matters.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="overview" number="1" title="Overview" titleAr="نظرة عامة">
        <p>
          At Dhuuus, we want you to be satisfied with our HSSE management platform. We offer 
          flexible subscription options and a fair refund policy. This document outlines the 
          terms and conditions for refunds and cancellations.
        </p>
        <p>
          All pricing is in Saudi Riyals (SAR) unless otherwise specified. By subscribing to 
          our services, you agree to the terms outlined in this policy.
        </p>
      </LegalSection>

      <LegalSection id="free-tier" number="2" title="Free Tier" titleAr="الخطة المجانية">
        <p>
          We offer a free tier with limited features for evaluation purposes. The free tier:
        </p>
        <LegalList
          items={[
            "Does not require a credit card to sign up",
            "Includes basic HSSE management features",
            "Has limited user and storage quotas",
            "Can be used indefinitely within its limitations",
            "Can be upgraded to a paid plan at any time",
          ]}
        />
        <p className="mt-4">
          Since no payment is required for the free tier, no refunds apply.
        </p>
      </LegalSection>

      <LegalSection id="paid-subscriptions" number="3" title="Paid Subscriptions" titleAr="الاشتراكات المدفوعة">
        <LegalSubSection number="3.1" title="Monthly Subscriptions">
          <LegalList
            items={[
              "Billed on the same date each month",
              "You can cancel at any time",
              "Service continues until the end of the billing period",
              "No partial month refunds are provided",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Annual Subscriptions">
          <LegalList
            items={[
              "Billed once per year on the subscription anniversary",
              "Typically offer a discount compared to monthly billing",
              "You can cancel at any time",
              "Service continues until the end of the annual billing period",
              "Pro-rata refunds may be available (see Refund Eligibility)",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.3" title="Enterprise Plans">
          <p>
            Enterprise plans have custom terms as specified in your service agreement. 
            Please refer to your contract for specific refund and cancellation terms.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="refund-eligibility" number="4" title="Refund Eligibility" titleAr="أهلية الاسترداد">
        <LegalSubSection number="4.1" title="Eligible for Refund">
          <p>You may be eligible for a refund in the following circumstances:</p>
          <LegalList
            items={[
              "First-time subscribers within 14 days of initial subscription (satisfaction guarantee)",
              "Service outage exceeding SLA commitments (as service credits)",
              "Billing errors or duplicate charges",
              "Annual subscription cancellation within 30 days of renewal",
              "Service unavailability due to our fault",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.2" title="14-Day Satisfaction Guarantee">
          <p>
            New subscribers can request a full refund within 14 days of their first paid 
            subscription if they are not satisfied with the service. This applies only to:
          </p>
          <LegalList
            items={[
              "First-time subscribers (not previously subscribed)",
              "Request made within 14 days of first payment",
              "No significant data upload or usage",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.3" title="Annual Subscription Refunds">
          <p>
            For annual subscriptions, if you cancel within 30 days of your renewal date, 
            you may request a pro-rata refund for the unused portion of your subscription, 
            minus a 10% administrative fee.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="refund-process" number="5" title="Refund Process" titleAr="عملية الاسترداد">
        <LegalSubSection number="5.1" title="How to Request a Refund">
          <LegalList
            ordered
            items={[
              "Contact our billing support at billing@dhuuus.com",
              "Include your account email and subscription details",
              "Explain the reason for your refund request",
              "Provide any relevant documentation (e.g., for billing errors)",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="5.2" title="Processing Time">
          <LegalList
            items={[
              "Refund requests are reviewed within 3-5 business days",
              "Approved refunds are processed within 5-10 business days",
              "Refunds are returned to the original payment method",
              "Bank processing times may add additional days",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="5.3" title="Service Credits">
          <p>
            In some cases, we may offer service credits instead of a refund. Service credits:
          </p>
          <LegalList
            items={[
              "Can be applied to future subscription payments",
              "Are valid for 12 months from issue date",
              "Cannot be converted to cash",
              "Are non-transferable",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="cancellation" number="6" title="Cancellation" titleAr="الإلغاء">
        <LegalSubSection number="6.1" title="How to Cancel">
          <p>You can cancel your subscription through:</p>
          <LegalList
            items={[
              "Account Settings > Subscription > Cancel Subscription",
              "Contacting our support team at support@dhuuus.com",
              "For Enterprise plans, contact your account manager",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="6.2" title="Effect of Cancellation">
          <LegalList
            items={[
              "Your subscription remains active until the end of the billing period",
              "You retain full access to features until the subscription expires",
              "You have 30 days after expiration to export your data",
              "After 30 days, your data may be permanently deleted",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="6.3" title="Reactivation">
          <p>
            If you wish to reactivate your subscription after cancellation, you can do so 
            through your account settings. Your data will be preserved if you reactivate 
            within 30 days of expiration.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="non-refundable" number="7" title="Non-Refundable Items" titleAr="العناصر غير القابلة للاسترداد">
        <p>The following are not eligible for refunds:</p>
        <LegalList
          items={[
            "Partial month subscriptions",
            "Used service credits",
            "Overage charges for usage beyond plan limits",
            "Setup fees or implementation services (once delivered)",
            "Training or consultation services (once provided)",
            "Add-on purchases after 14 days",
            "Subscriptions terminated for Terms of Service violations",
            "Subscriptions where the 14-day guarantee has been previously used",
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" number="8" title="Contact Us" titleAr="اتصل بنا">
        <p>
          For billing questions, refund requests, or cancellation assistance, please contact:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p><strong>Billing Support:</strong> billing@dhuuus.com</p>
          <p><strong>General Support:</strong> support@dhuuus.com</p>
          <p><strong>Phone:</strong> Available during business hours (Sunday-Thursday, 9 AM - 6 PM AST)</p>
        </div>
        <p className="mt-4">
          Please include your account email and subscription details when contacting us to 
          expedite your request.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
