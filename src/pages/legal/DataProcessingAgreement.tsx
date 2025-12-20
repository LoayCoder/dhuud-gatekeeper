import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "parties", number: "1", title: "Parties & Scope" },
  { id: "definitions", number: "2", title: "Definitions" },
  { id: "processing-details", number: "3", title: "Processing Details" },
  { id: "obligations", number: "4", title: "Processor Obligations" },
  { id: "sub-processors", number: "5", title: "Sub-Processors" },
  { id: "security", number: "6", title: "Security Measures" },
  { id: "data-breach", number: "7", title: "Data Breach Notification" },
  { id: "data-subject-rights", number: "8", title: "Data Subject Rights" },
  { id: "audit", number: "9", title: "Audit Rights" },
  { id: "data-return", number: "10", title: "Data Return & Deletion" },
  { id: "liability", number: "11", title: "Liability" },
  { id: "term", number: "12", title: "Term & Termination" },
];

export default function DataProcessingAgreement() {
  return (
    <LegalPageLayout
      title="Data Processing Agreement"
      titleAr="اتفاقية معالجة البيانات"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          This Data Processing Agreement ("DPA") forms part of the Terms of Service between 
          Dhuuus and the Subscriber (the "Controller") and governs the processing of personal 
          data by Dhuuus (the "Processor") on behalf of the Controller.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="parties" number="1" title="Parties & Scope" titleAr="الأطراف والنطاق">
        <LegalSubSection number="1.1" title="Parties">
          <p>This DPA is entered into between:</p>
          <LegalList
            items={[
              "The Subscriber organization ('Controller', 'you', 'your') who has subscribed to Dhuuus services",
              "Dhuuus ('Processor', 'we', 'us', 'our') as the service provider",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="1.2" title="Scope">
          <p>
            This DPA applies to all processing of personal data carried out by the Processor 
            on behalf of the Controller in connection with the provision of the Dhuuus HSSE 
            management platform.
          </p>
        </LegalSubSection>

        <LegalSubSection number="1.3" title="Precedence">
          <p>
            In the event of any conflict between this DPA and the Terms of Service, this DPA 
            shall prevail with respect to data protection matters.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="definitions" number="2" title="Definitions" titleAr="التعريفات">
        <p>In this DPA, the following terms have the meanings set out below:</p>
        <LegalList
          items={[
            '"Personal Data" means any information relating to an identified or identifiable natural person',
            '"Processing" means any operation performed on Personal Data, including collection, storage, alteration, retrieval, use, disclosure, and destruction',
            '"Data Subject" means the individual to whom the Personal Data relates',
            '"Sub-Processor" means any third party engaged by the Processor to process Personal Data',
            '"Data Breach" means any breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data',
            '"Applicable Data Protection Laws" means the Saudi PDPL, GDPR (where applicable), and any other relevant data protection legislation',
          ]}
        />
      </LegalSection>

      <LegalSection id="processing-details" number="3" title="Processing Details" titleAr="تفاصيل المعالجة">
        <LegalSubSection number="3.1" title="Subject Matter">
          <p>
            The processing relates to the provision of HSSE management services, including 
            incident management, inspections, visitor management, contractor oversight, and 
            related safety operations.
          </p>
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Categories of Data Subjects">
          <LegalList
            items={[
              "Employees of the Controller",
              "Contractors and their workers",
              "Visitors to Controller's premises",
              "Third-party representatives",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.3" title="Types of Personal Data">
          <LegalList
            items={[
              "Identification data: names, national IDs, passport numbers",
              "Contact data: email addresses, phone numbers",
              "Employment data: job titles, departments, employers",
              "Safety data: incident reports, training records, certifications",
              "Access data: visit logs, gate pass records",
              "Location data: GPS coordinates, site assignments",
              "Media: photographs for identification purposes",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="3.4" title="Duration">
          <p>
            Processing will continue for the duration of the subscription and any applicable 
            retention periods as outlined in our Privacy Policy and data retention schedules.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="obligations" number="4" title="Processor Obligations" titleAr="التزامات المعالج">
        <p>The Processor shall:</p>
        <LegalList
          items={[
            "Process Personal Data only on documented instructions from the Controller",
            "Ensure personnel authorized to process Personal Data are bound by confidentiality obligations",
            "Implement appropriate technical and organizational security measures",
            "Assist the Controller in responding to data subject requests",
            "Assist the Controller in ensuring compliance with security, breach notification, and impact assessment obligations",
            "Delete or return Personal Data upon termination as directed by the Controller",
            "Make available information necessary to demonstrate compliance with this DPA",
            "Not process Personal Data outside the scope of the Controller's instructions unless required by law",
          ]}
        />
      </LegalSection>

      <LegalSection id="sub-processors" number="5" title="Sub-Processors" titleAr="المعالجون الفرعيون">
        <LegalSubSection number="5.1" title="Authorization">
          <p>
            The Controller provides general authorization for the Processor to engage 
            Sub-Processors to perform specific processing activities. The Processor maintains 
            a list of current Sub-Processors.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.2" title="Current Sub-Processors">
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">Cloud Infrastructure Provider</p>
              <p className="text-sm">Purpose: Hosting and data storage</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">Resend</p>
              <p className="text-sm">Purpose: Email delivery services</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">Twilio</p>
              <p className="text-sm">Purpose: SMS and WhatsApp messaging</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="font-medium">Stripe</p>
              <p className="text-sm">Purpose: Payment processing</p>
            </div>
          </div>
        </LegalSubSection>

        <LegalSubSection number="5.3" title="Sub-Processor Changes">
          <p>
            The Processor will notify the Controller of any intended changes to Sub-Processors 
            at least 30 days in advance. The Controller may object to such changes within 14 
            days of notification.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.4" title="Sub-Processor Agreements">
          <p>
            The Processor ensures that all Sub-Processors are bound by data protection 
            obligations no less protective than those set out in this DPA.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="security" number="6" title="Security Measures" titleAr="تدابير الأمان">
        <p>
          The Processor implements the following technical and organizational measures:
        </p>

        <LegalSubSection number="6.1" title="Technical Measures">
          <LegalList
            items={[
              "Encryption of data at rest and in transit using TLS 1.3",
              "Secure password hashing using bcrypt or equivalent",
              "Multi-factor authentication support",
              "Row-level security for multi-tenant data isolation",
              "Regular automated backups with encryption",
              "Intrusion detection and prevention systems",
              "Regular vulnerability assessments and penetration testing",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="6.2" title="Organizational Measures">
          <LegalList
            items={[
              "Role-based access control with principle of least privilege",
              "Employee background checks and confidentiality agreements",
              "Regular security awareness training",
              "Incident response procedures",
              "Business continuity and disaster recovery plans",
              "Regular internal and external security audits",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="data-breach" number="7" title="Data Breach Notification" titleAr="إشعار خرق البيانات">
        <LegalSubSection number="7.1" title="Notification Timeline">
          <p>
            The Processor will notify the Controller of any Data Breach without undue delay 
            and in any event within <strong>72 hours</strong> of becoming aware of the breach.
          </p>
        </LegalSubSection>

        <LegalSubSection number="7.2" title="Notification Content">
          <p>The notification will include, to the extent known:</p>
          <LegalList
            items={[
              "Description of the nature of the breach",
              "Categories and approximate number of Data Subjects affected",
              "Categories and approximate number of records affected",
              "Contact details of the Processor's data protection point of contact",
              "Description of likely consequences",
              "Description of measures taken or proposed to address the breach",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="7.3" title="Assistance">
          <p>
            The Processor will cooperate with the Controller and provide reasonable assistance 
            to investigate the breach, mitigate its effects, and comply with any legal notification 
            requirements.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="data-subject-rights" number="8" title="Data Subject Rights" titleAr="حقوق أصحاب البيانات">
        <p>
          The Processor will assist the Controller in responding to requests from Data Subjects 
          to exercise their rights, including:
        </p>
        <LegalList
          items={[
            "Right of access to their Personal Data",
            "Right to rectification of inaccurate data",
            "Right to erasure (subject to legal retention requirements)",
            "Right to restriction of processing",
            "Right to data portability",
            "Right to object to processing",
          ]}
        />
        <p className="mt-4">
          The Processor will respond to Controller's assistance requests within 10 business days.
        </p>
      </LegalSection>

      <LegalSection id="audit" number="9" title="Audit Rights" titleAr="حقوق التدقيق">
        <LegalSubSection number="9.1" title="Information Access">
          <p>
            The Processor will make available to the Controller all information necessary to 
            demonstrate compliance with this DPA.
          </p>
        </LegalSubSection>

        <LegalSubSection number="9.2" title="Audit Procedure">
          <p>
            The Controller may conduct audits, subject to the following conditions:
          </p>
          <LegalList
            items={[
              "Audits require 30 days advance written notice",
              "Audits must be conducted during normal business hours",
              "Auditors must be bound by confidentiality obligations",
              "Audits must not unreasonably disrupt Processor's operations",
              "Controller bears the cost of audits beyond one per year",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="9.3" title="Third-Party Certifications">
          <p>
            The Processor may satisfy audit requirements by providing relevant third-party 
            certifications, audit reports, or assessment results.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="data-return" number="10" title="Data Return & Deletion" titleAr="إرجاع البيانات وحذفها">
        <LegalSubSection number="10.1" title="Upon Termination">
          <p>
            Upon termination of the services, the Processor will, at the Controller's choice:
          </p>
          <LegalList
            items={[
              "Return all Personal Data to the Controller in a structured, commonly used format",
              "Delete all Personal Data and certify such deletion",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="10.2" title="Export Period">
          <p>
            The Controller has 30 days from termination to export data. After this period, 
            the Processor will delete the data unless retention is required by applicable law.
          </p>
        </LegalSubSection>

        <LegalSubSection number="10.3" title="Legal Retention">
          <p>
            Where the Processor is required by law to retain certain Personal Data, it will 
            inform the Controller and ensure such data remains protected under this DPA.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="liability" number="11" title="Liability" titleAr="المسؤولية">
        <p>
          Each party's liability under this DPA is subject to the limitations set out in the 
          Terms of Service. Neither party limits its liability for:
        </p>
        <LegalList
          items={[
            "Death or personal injury caused by negligence",
            "Fraud or fraudulent misrepresentation",
            "Any liability that cannot be limited by law",
          ]}
        />
      </LegalSection>

      <LegalSection id="term" number="12" title="Term & Termination" titleAr="المدة والإنهاء">
        <p>
          This DPA shall remain in effect for the duration of the subscription agreement and 
          for as long as the Processor processes Personal Data on behalf of the Controller.
        </p>
        <p className="mt-4">
          The obligations under this DPA survive termination to the extent necessary to 
          complete any ongoing processing, return or delete data, and comply with legal 
          retention requirements.
        </p>
      </LegalSection>

      <div className="mt-12 p-6 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          This DPA is automatically incorporated into your subscription agreement with Dhuuus. 
          For questions about this DPA or to request a signed copy, please contact{" "}
          <strong>legal@dhuuus.com</strong>.
        </p>
      </div>
    </LegalPageLayout>
  );
}
