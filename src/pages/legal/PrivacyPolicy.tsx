import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "introduction", number: "1", title: "Introduction" },
  { id: "data-controller", number: "2", title: "Data Controller" },
  { id: "data-collection", number: "3", title: "Data We Collect" },
  { id: "purpose", number: "4", title: "Purpose of Data Processing" },
  { id: "legal-basis", number: "5", title: "Legal Basis for Processing" },
  { id: "data-sharing", number: "6", title: "Data Sharing & Disclosure" },
  { id: "data-retention", number: "7", title: "Data Retention" },
  { id: "data-security", number: "8", title: "Data Security" },
  { id: "user-rights", number: "9", title: "Your Rights" },
  { id: "international", number: "10", title: "International Transfers" },
  { id: "cookies", number: "11", title: "Cookies" },
  { id: "children", number: "12", title: "Children's Privacy" },
  { id: "updates", number: "13", title: "Policy Updates" },
  { id: "contact", number: "14", title: "Contact Us" },
];

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      titleAr="سياسة الخصوصية"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          <strong>Your Privacy Matters:</strong> At Dhuuus, we are committed to protecting your privacy 
          and ensuring the security of your personal data. This Privacy Policy explains how we collect, 
          use, share, and protect your information when you use our HSSE management platform.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="introduction" number="1" title="Introduction" titleAr="المقدمة">
        <p>
          This Privacy Policy ("Policy") describes how Dhuuus ("we", "us", "our", or the "Company") 
          collects, uses, shares, and protects personal information when you use our Health, Safety, 
          Security, and Environment (HSSE) management platform (the "Platform" or "Service").
        </p>
        <p>
          We are committed to processing personal data in accordance with applicable data protection 
          laws, including the Saudi Personal Data Protection Law (PDPL), the European General Data 
          Protection Regulation (GDPR) where applicable, and other relevant privacy regulations.
        </p>
        <p>
          By using our Platform, you acknowledge that you have read and understood this Privacy Policy 
          and consent to the collection and use of your information as described herein.
        </p>
      </LegalSection>

      <LegalSection id="data-controller" number="2" title="Data Controller" titleAr="مراقب البيانات">
        <p>
          Dhuuus acts as the Data Controller for personal data collected through the Platform. 
          For data processed on behalf of our Tenant organizations (Subscribers), we act as a 
          Data Processor, and the Tenant acts as the Data Controller.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p><strong>Data Controller:</strong></p>
          <p>Dhuuus</p>
          <p>Riyadh, Kingdom of Saudi Arabia</p>
          <p>Email: privacy@dhuuus.com</p>
        </div>
      </LegalSection>

      <LegalSection id="data-collection" number="3" title="Data We Collect" titleAr="البيانات التي نجمعها">
        <p>We collect various types of information to provide and improve our Services:</p>
        
        <LegalSubSection number="3.1" title="Account Information">
          <LegalList
            items={[
              "Full name (English and Arabic)",
              "Email address",
              "Phone/mobile number",
              "Organization/company name",
              "Job title and department",
              "Profile photograph (optional)",
              "Password (encrypted)",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Safety & Operational Data">
          <LegalList
            items={[
              "Incident reports and investigation details",
              "Inspection records and findings",
              "Corrective action assignments and completions",
              "Safety observations and near-miss reports",
              "Audit findings and compliance records",
              "Training and certification records",
              "Permit to work applications and approvals",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.3" title="Visitor & Contractor Data">
          <LegalList
            items={[
              "Visitor names and contact information",
              "National ID or passport numbers",
              "Company affiliations",
              "Visit purpose and duration",
              "Safety induction completion records",
              "Medical examination dates and certifications",
              "Photographs for identification purposes",
              "Gate pass and access log history",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.4" title="Location Data">
          <LegalList
            items={[
              "GPS coordinates during inspections (with consent)",
              "Site and building location assignments",
              "Patrol route tracking for security personnel",
              "Incident location data",
              "Geo-tagged photographs",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.5" title="Device & Technical Data">
          <LegalList
            items={[
              "IP addresses",
              "Browser type and version",
              "Device type and operating system",
              "Unique device identifiers",
              "Login timestamps and session duration",
              "Feature usage patterns",
              "Error logs and crash reports",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.6" title="Communication Data">
          <LegalList
            items={[
              "Support ticket communications",
              "In-app notifications sent and received",
              "Email and SMS notification preferences",
              "Feedback and survey responses",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="purpose" number="4" title="Purpose of Data Processing" titleAr="أغراض معالجة البيانات">
        <p>We process your personal data for the following purposes:</p>
        
        <LegalSubSection number="4.1" title="Service Provision">
          <LegalList
            items={[
              "Creating and managing user accounts",
              "Providing HSSE management functionality",
              "Processing incident reports and investigations",
              "Managing inspections and audits",
              "Facilitating visitor and contractor management",
              "Generating reports and analytics",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.2" title="Safety & Compliance">
          <LegalList
            items={[
              "Meeting regulatory reporting requirements",
              "Maintaining safety records as required by law",
              "Supporting workplace safety investigations",
              "Tracking corrective actions and compliance",
              "Managing certifications and qualifications",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.3" title="Platform Improvement">
          <LegalList
            items={[
              "Analyzing usage patterns to improve features",
              "Identifying and fixing technical issues",
              "Developing new functionality",
              "Optimizing platform performance",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.4" title="Communication">
          <LegalList
            items={[
              "Sending service notifications and alerts",
              "Responding to support inquiries",
              "Providing important service updates",
              "Marketing communications (with consent)",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.5" title="Security">
          <LegalList
            items={[
              "Protecting against unauthorized access",
              "Detecting and preventing fraud",
              "Maintaining audit trails",
              "Enforcing our Terms of Service",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="legal-basis" number="5" title="Legal Basis for Processing" titleAr="الأساس القانوني للمعالجة">
        <p>We process your personal data based on the following legal grounds:</p>
        
        <LegalSubSection number="5.1" title="Contract Performance">
          <p>
            Processing necessary to perform our contract with you or your organization, including 
            providing the Platform services and managing your account.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.2" title="Legal Obligation">
          <p>
            Processing required to comply with legal obligations, including workplace safety regulations, 
            incident reporting requirements, and record retention mandates.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.3" title="Legitimate Interests">
          <p>
            Processing based on our legitimate interests in operating and improving the Platform, 
            ensuring security, and preventing fraud, provided such interests are not overridden by 
            your fundamental rights.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.4" title="Consent">
          <p>
            Processing based on your explicit consent for specific activities such as marketing 
            communications, optional location tracking, and certain analytics.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="data-sharing" number="6" title="Data Sharing & Disclosure" titleAr="مشاركة البيانات والإفصاح">
        <LegalSubSection number="6.1" title="Within Your Organization">
          <p>
            Your data may be shared with other authorized users within your Tenant organization 
            based on role-based access controls configured by your Administrator.
          </p>
        </LegalSubSection>

        <LegalSubSection number="6.2" title="Service Providers">
          <p>We engage trusted third-party service providers to help deliver our Services:</p>
          <LegalList
            items={[
              "Cloud Infrastructure: Secure hosting and data storage",
              "Email Delivery (Resend): Transactional email notifications",
              "SMS/WhatsApp (Twilio): Mobile notifications and alerts",
              "Payment Processing (Stripe): Subscription billing",
              "AI Services: Document analysis and report generation",
              "Analytics: Usage insights and platform optimization",
            ]}
          />
          <p className="mt-2">
            All service providers are bound by data processing agreements and are required to 
            maintain appropriate security measures.
          </p>
        </LegalSubSection>

        <LegalSubSection number="6.3" title="Legal Requirements">
          <p>We may disclose your data when required to:</p>
          <LegalList
            items={[
              "Comply with applicable laws and regulations",
              "Respond to valid legal processes (court orders, subpoenas)",
              "Cooperate with regulatory authorities",
              "Protect our rights, property, or safety",
              "Investigate potential violations of our Terms",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="6.4" title="Business Transfers">
          <p>
            In the event of a merger, acquisition, or sale of assets, your personal data may be 
            transferred as part of the business transaction. We will notify you of any such change 
            and any choices you may have regarding your data.
          </p>
        </LegalSubSection>

        <LegalSubSection number="6.5" title="No Sale of Personal Data">
          <p>
            <strong>We do not sell your personal data to third parties.</strong> We do not share 
            your data with advertisers or data brokers.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="data-retention" number="7" title="Data Retention" titleAr="الاحتفاظ بالبيانات">
        <p>We retain personal data for as long as necessary to fulfill the purposes outlined in this Policy:</p>
        
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-muted rounded">
            <p className="font-medium">Active Account Data</p>
            <p className="text-sm">Retained for the duration of your subscription plus 1 year</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <p className="font-medium">Incident Records</p>
            <p className="text-sm">Retained for 10 years (regulatory compliance)</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <p className="font-medium">Audit Logs</p>
            <p className="text-sm">Retained for 7 years (security and compliance)</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <p className="font-medium">Inspection Records</p>
            <p className="text-sm">Retained for 5 years after completion</p>
          </div>
          <div className="p-3 bg-muted rounded">
            <p className="font-medium">Visitor/Contractor Access Logs</p>
            <p className="text-sm">Retained for 3 years</p>
          </div>
        </div>

        <p className="mt-4">
          We use soft-delete mechanisms to preserve data integrity. Deleted records are marked as 
          inactive but may be retained for the periods specified above for legal and compliance purposes.
        </p>
      </LegalSection>

      <LegalSection id="data-security" number="8" title="Data Security" titleAr="أمن البيانات">
        <p>We implement comprehensive security measures to protect your personal data:</p>

        <LegalSubSection number="8.1" title="Technical Safeguards">
          <LegalList
            items={[
              "Encryption of data at rest and in transit (TLS 1.3)",
              "Secure password hashing using industry-standard algorithms",
              "Multi-factor authentication (MFA) support",
              "Regular security assessments and penetration testing",
              "Automated vulnerability scanning",
              "Intrusion detection and prevention systems",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="8.2" title="Access Controls">
          <LegalList
            items={[
              "Role-based access control (RBAC)",
              "Row-level security for multi-tenant data isolation",
              "Principle of least privilege for system access",
              "Regular access reviews and audits",
              "Session timeout and automatic logout",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="8.3" title="Organizational Measures">
          <LegalList
            items={[
              "Employee security training and awareness programs",
              "Background checks for personnel with data access",
              "Confidentiality agreements with all staff",
              "Incident response procedures",
              "Business continuity and disaster recovery plans",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="user-rights" number="9" title="Your Rights" titleAr="حقوقك">
        <p>You have the following rights regarding your personal data:</p>

        <LegalSubSection number="9.1" title="Right to Access">
          <p>
            You can request a copy of the personal data we hold about you. We will provide this 
            information within 30 days of your request.
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.2" title="Right to Rectification">
          <p>
            You can update or correct inaccurate personal data through your account settings or 
            by contacting us.
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.3" title="Right to Erasure">
          <p>
            You can request deletion of your personal data, subject to legal retention requirements 
            and our legitimate interests. Certain data may need to be retained for regulatory compliance.
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.4" title="Right to Data Portability">
          <p>
            You can request your data in a structured, commonly used, machine-readable format 
            (JSON or CSV).
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.5" title="Right to Object">
          <p>
            You can object to certain processing activities, including direct marketing communications.
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.6" title="Right to Withdraw Consent">
          <p>
            Where processing is based on consent, you can withdraw your consent at any time. This 
            will not affect the lawfulness of processing conducted before withdrawal.
          </p>
        </LegalSubSection>

        <p className="mt-4">
          To exercise any of these rights, please contact us at{" "}
          <strong>privacy@dhuuus.com</strong>. We will respond to your request within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="international" number="10" title="International Transfers" titleAr="النقل الدولي للبيانات">
        <p>
          Your data is primarily stored and processed in the Kingdom of Saudi Arabia. However, 
          some of our service providers may process data in other jurisdictions.
        </p>
        <p>
          When we transfer data internationally, we implement appropriate safeguards including:
        </p>
        <LegalList
          items={[
            "Standard contractual clauses approved by regulatory authorities",
            "Data processing agreements with all sub-processors",
            "Verification that recipients maintain adequate security measures",
            "Compliance with cross-border data transfer requirements",
          ]}
        />
      </LegalSection>

      <LegalSection id="cookies" number="11" title="Cookies" titleAr="ملفات تعريف الارتباط">
        <p>
          We use cookies and similar technologies to enhance your experience on our Platform. 
          For detailed information about the cookies we use and how to manage them, please refer 
          to our <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a>.
        </p>
      </LegalSection>

      <LegalSection id="children" number="12" title="Children's Privacy" titleAr="خصوصية الأطفال">
        <p>
          The Platform is not intended for use by individuals under the age of 18. We do not 
          knowingly collect personal data from children. If we become aware that we have collected 
          data from a child without parental consent, we will take steps to delete such information.
        </p>
      </LegalSection>

      <LegalSection id="updates" number="13" title="Policy Updates" titleAr="تحديثات السياسة">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices 
          or applicable laws. We will notify you of material changes by:
        </p>
        <LegalList
          items={[
            "Posting the updated Policy on our Platform",
            "Updating the 'Last Updated' date at the top of this page",
            "Sending email notification for significant changes",
            "Displaying an in-app notice for major updates",
          ]}
        />
        <p className="mt-2">
          We encourage you to review this Policy periodically to stay informed about our data practices.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="14" title="Contact Us" titleAr="اتصل بنا">
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or our data 
          practices, please contact us:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p><strong>Privacy Inquiries:</strong></p>
          <p>Email: privacy@dhuuus.com</p>
          <p><strong>Data Protection Officer:</strong></p>
          <p>Email: dpo@dhuuus.com</p>
          <p><strong>General Contact:</strong></p>
          <p>Dhuuus</p>
          <p>Riyadh, Kingdom of Saudi Arabia</p>
          <p>Email: support@dhuuus.com</p>
        </div>
      </LegalSection>

      <div className="mt-12 p-6 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          We are committed to protecting your privacy and handling your personal data responsibly. 
          Thank you for trusting Dhuuus with your HSSE management needs.
        </p>
      </div>
    </LegalPageLayout>
  );
}
