import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "introduction", number: "1", title: "Introduction" },
  { id: "permitted-use", number: "2", title: "Permitted Use" },
  { id: "prohibited-activities", number: "3", title: "Prohibited Activities" },
  { id: "content-guidelines", number: "4", title: "Content Guidelines" },
  { id: "security", number: "5", title: "Security Requirements" },
  { id: "reporting", number: "6", title: "Reporting Violations" },
  { id: "enforcement", number: "7", title: "Enforcement" },
  { id: "contact", number: "8", title: "Contact Us" },
];

export default function AcceptableUsePolicy() {
  return (
    <LegalPageLayout
      title="Acceptable Use Policy"
      titleAr="سياسة الاستخدام المقبول"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          This Acceptable Use Policy ("AUP") governs your use of the Dhuuus platform. By using 
          our services, you agree to comply with this policy. Violations may result in suspension 
          or termination of your account.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="introduction" number="1" title="Introduction" titleAr="المقدمة">
        <p>
          This Acceptable Use Policy is designed to protect the Dhuuus platform, our users, and 
          the broader community from inappropriate, harmful, or illegal activities. This policy 
          supplements our Terms of Service and applies to all users of our HSSE management platform.
        </p>
        <p>
          We expect all users to act responsibly, ethically, and in compliance with applicable 
          laws when using our platform. The following guidelines outline what is and is not 
          acceptable use of our services.
        </p>
      </LegalSection>

      <LegalSection id="permitted-use" number="2" title="Permitted Use" titleAr="الاستخدام المسموح">
        <p>Our platform is designed for legitimate HSSE management activities, including:</p>
        <LegalList
          items={[
            "Recording and managing workplace incidents, injuries, and near-misses",
            "Conducting safety inspections and audits",
            "Managing visitor check-in/check-out processes",
            "Overseeing contractor safety compliance and access",
            "Tracking corrective actions and safety improvements",
            "Generating safety reports and compliance documentation",
            "Managing permits to work and job safety analyses",
            "Facilitating safety training and induction programs",
            "Asset safety inspection and maintenance scheduling",
            "Security patrol management and monitoring",
          ]}
        />
      </LegalSection>

      <LegalSection id="prohibited-activities" number="3" title="Prohibited Activities" titleAr="الأنشطة المحظورة">
        <p>The following activities are strictly prohibited:</p>

        <LegalSubSection number="3.1" title="Illegal Activities">
          <LegalList
            items={[
              "Using the platform for any unlawful purpose or in violation of any laws",
              "Engaging in activities that violate data protection or privacy laws",
              "Facilitating fraud, money laundering, or other financial crimes",
              "Infringing on intellectual property rights of others",
              "Violating export control or sanctions regulations",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Security Violations">
          <LegalList
            items={[
              "Attempting to gain unauthorized access to accounts, systems, or data",
              "Sharing login credentials with unauthorized individuals",
              "Circumventing access controls or security measures",
              "Testing for vulnerabilities without written authorization",
              "Distributing malware, viruses, or other harmful code",
              "Engaging in denial-of-service attacks or similar activities",
              "Intercepting or monitoring data without authorization",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.3" title="Data Misuse">
          <LegalList
            items={[
              "Scraping, harvesting, or collecting data through automated means",
              "Selling, renting, or sharing personal data without authorization",
              "Using data for purposes other than legitimate HSSE management",
              "Accessing data belonging to other tenants or organizations",
              "Creating false or misleading records or reports",
              "Deliberately corrupting or destroying data",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.4" title="Platform Abuse">
          <LegalList
            items={[
              "Using the platform in a way that degrades performance for other users",
              "Exceeding rate limits or usage quotas through abuse",
              "Reverse engineering, decompiling, or disassembling the platform",
              "Modifying, adapting, or creating derivative works of the platform",
              "Removing or altering proprietary notices or branding",
              "Using the platform to develop competing products",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.5" title="Harmful Behavior">
          <LegalList
            items={[
              "Harassing, threatening, or intimidating other users",
              "Impersonating another person or organization",
              "Spreading false information or engaging in defamation",
              "Discriminating against individuals based on protected characteristics",
              "Engaging in any behavior that creates a hostile environment",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="content-guidelines" number="4" title="Content Guidelines" titleAr="إرشادات المحتوى">
        <p>All content uploaded to the platform must adhere to the following guidelines:</p>

        <LegalSubSection number="4.1" title="Accuracy">
          <LegalList
            items={[
              "Incident reports must be accurate and truthful",
              "Inspection findings must reflect actual observations",
              "Documentation must be authentic and unaltered",
              "Data entered must be relevant to HSSE management purposes",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.2" title="Appropriateness">
          <LegalList
            items={[
              "Content must be relevant to workplace safety and compliance",
              "Images and videos must be appropriate for professional contexts",
              "Language must be professional and respectful",
              "Content must not contain offensive, obscene, or inappropriate material",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.3" title="Legal Compliance">
          <LegalList
            items={[
              "Content must not violate any applicable laws or regulations",
              "Content must not infringe on third-party intellectual property",
              "Content must comply with data protection requirements",
              "Content must not include unauthorized personal information",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="security" number="5" title="Security Requirements" titleAr="متطلبات الأمان">
        <p>All users are required to maintain appropriate security practices:</p>

        <LegalSubSection number="5.1" title="Account Security">
          <LegalList
            items={[
              "Use strong, unique passwords for your account",
              "Enable multi-factor authentication when available",
              "Never share your login credentials with others",
              "Log out when using shared or public devices",
              "Report any suspected unauthorized access immediately",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="5.2" title="Data Handling">
          <LegalList
            items={[
              "Access only the data necessary for your role",
              "Do not download or export data unnecessarily",
              "Store exported data securely and delete when no longer needed",
              "Report any data breaches or suspected data loss",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="5.3" title="Device Security">
          <LegalList
            items={[
              "Keep devices used to access the platform secure and updated",
              "Use antivirus and security software",
              "Avoid accessing the platform from unsecured networks",
              "Enable device encryption when possible",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="reporting" number="6" title="Reporting Violations" titleAr="الإبلاغ عن المخالفات">
        <p>
          If you become aware of any violation of this Acceptable Use Policy, please report it 
          to us immediately. You can report violations through:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p><strong>Email:</strong> abuse@dhuuus.com</p>
          <p><strong>Subject:</strong> AUP Violation Report</p>
        </div>
        <p className="mt-4">
          Please provide as much detail as possible, including screenshots, timestamps, and a 
          description of the violation. We will investigate all reports promptly and take 
          appropriate action.
        </p>
        <p>
          We protect the identity of reporters and prohibit any retaliation against individuals 
          who report violations in good faith.
        </p>
      </LegalSection>

      <LegalSection id="enforcement" number="7" title="Enforcement" titleAr="التنفيذ">
        <LegalSubSection number="7.1" title="Violation Response">
          <p>
            When we become aware of a potential violation, we will investigate and may take 
            appropriate action, which could include:
          </p>
          <LegalList
            items={[
              "Issuing a warning to the user",
              "Temporarily suspending account access",
              "Permanently terminating the account",
              "Removing or disabling access to content",
              "Reporting violations to law enforcement if required",
              "Pursuing legal action for serious violations",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="7.2" title="Severity Levels">
          <p>The action taken will depend on the severity of the violation:</p>
          <LegalList
            items={[
              "Minor violations may result in a warning",
              "Repeated minor violations may result in suspension",
              "Serious violations may result in immediate termination",
              "Illegal activities will be reported to authorities",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="7.3" title="Appeals">
          <p>
            If you believe action was taken against your account in error, you may appeal by 
            contacting us at appeals@dhuuus.com. We will review your appeal and respond within 
            10 business days.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="contact" number="8" title="Contact Us" titleAr="اتصل بنا">
        <p>
          If you have questions about this Acceptable Use Policy, please contact us:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p><strong>General Inquiries:</strong> support@dhuuus.com</p>
          <p><strong>Abuse Reports:</strong> abuse@dhuuus.com</p>
          <p><strong>Security Issues:</strong> security@dhuuus.com</p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
