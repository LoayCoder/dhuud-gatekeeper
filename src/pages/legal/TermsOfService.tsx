import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList, DefinitionList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "introduction", number: "1", title: "Introduction & Acceptance" },
  { id: "definitions", number: "2", title: "Definitions" },
  { id: "account", number: "3", title: "Account & Subscription" },
  { id: "acceptable-use", number: "4", title: "Acceptable Use" },
  { id: "intellectual-property", number: "5", title: "Intellectual Property" },
  { id: "user-content", number: "6", title: "User Content & Data" },
  { id: "service-limitations", number: "7", title: "Service Limitations" },
  { id: "liability", number: "8", title: "Liability & Warranties" },
  { id: "termination", number: "9", title: "Termination" },
  { id: "governing-law", number: "10", title: "Governing Law & Disputes" },
];

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      titleAr="شروط الخدمة"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          <strong>Important:</strong> Please read these Terms of Service carefully before using the Dhuuus platform. 
          By accessing or using our services, you agree to be bound by these terms. If you do not agree to these terms, 
          please do not use our services.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="introduction" number="1" title="Introduction & Acceptance" titleAr="المقدمة والقبول">
        <p>
          Welcome to Dhuuus ("Platform", "Service", "we", "us", or "our"). Dhuuus is a comprehensive 
          Health, Safety, Security, and Environment (HSSE) management Software-as-a-Service (SaaS) platform 
          designed to help organizations manage their safety operations, incidents, inspections, visitor management, 
          contractor oversight, and compliance requirements.
        </p>
        <p>
          These Terms of Service ("Terms", "Agreement") constitute a legally binding agreement between you 
          ("User", "you", "your") and Dhuuus governing your access to and use of the Platform and all related 
          services, features, content, and applications.
        </p>
        <LegalSubSection number="1.1" title="Agreement to Terms">
          <p>
            By creating an account, accessing, or using any part of our Platform, you acknowledge that you have 
            read, understood, and agree to be bound by these Terms. If you are using the Platform on behalf of 
            an organization, you represent and warrant that you have the authority to bind that organization to 
            these Terms.
          </p>
        </LegalSubSection>
        <LegalSubSection number="1.2" title="Modifications to Terms">
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any material changes 
            by posting the updated Terms on our Platform and updating the "Last Updated" date. Your continued 
            use of the Platform after such modifications constitutes your acceptance of the updated Terms.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="definitions" number="2" title="Definitions" titleAr="التعريفات">
        <p>The following terms shall have the meanings set forth below:</p>
        <DefinitionList
          definitions={[
            { term: "Tenant", definition: "An organization or company that has subscribed to Dhuuus and whose data is logically isolated within the Platform." },
            { term: "Administrator", definition: "A User with elevated privileges who can manage other Users, configure settings, and access administrative functions within a Tenant." },
            { term: "User", definition: "Any individual who accesses or uses the Platform, including Administrators, employees, contractors, and visitors." },
            { term: "Subscriber", definition: "The legal entity or individual that has entered into a subscription agreement with Dhuuus." },
            { term: "Services", definition: "All features, functionalities, tools, and applications provided through the Dhuuus Platform." },
            { term: "Content", definition: "All text, data, information, files, images, videos, and other materials uploaded, submitted, or generated through the Platform." },
            { term: "Personal Data", definition: "Any information relating to an identified or identifiable natural person as defined under applicable data protection laws." },
            { term: "Subscription Plan", definition: "The specific tier of service (Starter, Professional, or Enterprise) selected by the Subscriber." },
          ]}
        />
      </LegalSection>

      <LegalSection id="account" number="3" title="Account & Subscription" titleAr="الحساب والاشتراك">
        <LegalSubSection number="3.1" title="Eligibility">
          <p>To use our Platform, you must:</p>
          <LegalList
            items={[
              "Be at least 18 years of age or the age of legal majority in your jurisdiction",
              "Have the legal capacity to enter into binding agreements",
              "Not be barred from using the services under applicable law",
              "Be an authorized representative if using the Platform on behalf of an organization",
            ]}
          />
        </LegalSubSection>
        <LegalSubSection number="3.2" title="Account Registration">
          <p>
            When creating an account, you agree to provide accurate, current, and complete information. 
            You are responsible for maintaining the confidentiality of your account credentials and for 
            all activities that occur under your account. You must immediately notify us of any unauthorized 
            use of your account.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.3" title="Multi-Tenant Architecture">
          <p>
            Dhuuus operates on a multi-tenant architecture where each Subscriber's data is logically 
            isolated. While the underlying infrastructure may be shared, strict security measures ensure 
            that your data remains private and inaccessible to other Tenants.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.4" title="Subscription Plans & Billing">
          <p>Our Platform offers the following subscription tiers:</p>
          <LegalList
            items={[
              "Starter Plan: Basic HSSE management features suitable for small organizations",
              "Professional Plan: Advanced features including full inspection, incident management, and reporting",
              "Enterprise Plan: Comprehensive features with custom integrations, dedicated support, and enhanced SLAs",
            ]}
          />
          <p className="mt-4">
            Billing is conducted on a monthly or annual basis as selected during subscription. All fees 
            are quoted in Saudi Riyals (SAR) unless otherwise specified. Subscription fees are non-refundable 
            except as set forth in our Refund Policy.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.5" title="Usage Quotas">
          <p>
            Each subscription plan includes specific usage quotas including but not limited to: number of 
            user profiles, storage capacity, API call limits, and number of monthly inspections. Exceeding 
            these quotas may result in additional charges or service limitations as outlined in your plan details.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="acceptable-use" number="4" title="Acceptable Use" titleAr="الاستخدام المقبول">
        <LegalSubSection number="4.1" title="Permitted Uses">
          <p>You may use the Platform for:</p>
          <LegalList
            items={[
              "Managing health, safety, security, and environmental operations",
              "Recording, tracking, and investigating incidents and near-misses",
              "Conducting inspections and audits",
              "Managing visitor and contractor access",
              "Generating compliance reports and analytics",
              "Training and safety induction management",
              "Any other lawful purpose consistent with the Platform's intended use",
            ]}
          />
        </LegalSubSection>
        <LegalSubSection number="4.2" title="Prohibited Activities">
          <p>You agree NOT to:</p>
          <LegalList
            items={[
              "Use the Platform for any unlawful purpose or in violation of any applicable laws",
              "Attempt to gain unauthorized access to any part of the Platform or other users' accounts",
              "Interfere with or disrupt the integrity or performance of the Platform",
              "Upload or transmit viruses, malware, or other malicious code",
              "Reverse engineer, decompile, or attempt to extract the source code of the Platform",
              "Scrape, data mine, or collect user information without authorization",
              "Use the Platform to harass, abuse, or harm other users",
              "Impersonate any person or entity or misrepresent your affiliation",
              "Circumvent any access controls or usage limitations",
              "Share login credentials with unauthorized parties",
              "Use the Platform in any way that could damage our reputation or goodwill",
            ]}
          />
        </LegalSubSection>
        <LegalSubSection number="4.3" title="Content Standards">
          <p>All content uploaded to the Platform must:</p>
          <LegalList
            items={[
              "Be accurate and not misleading",
              "Comply with all applicable laws and regulations",
              "Not infringe on any third party's intellectual property rights",
              "Not contain illegal, defamatory, or objectionable material",
              "Be appropriate for the professional context of HSSE management",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="intellectual-property" number="5" title="Intellectual Property" titleAr="الملكية الفكرية">
        <LegalSubSection number="5.1" title="Platform Ownership">
          <p>
            The Platform, including its design, source code, algorithms, graphics, logos, trademarks, 
            and all related intellectual property, is owned by Dhuuus or its licensors. Nothing in these 
            Terms grants you any ownership rights in the Platform.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.2" title="License to Use">
          <p>
            Subject to your compliance with these Terms and payment of applicable fees, we grant you a 
            limited, non-exclusive, non-transferable, revocable license to access and use the Platform 
            for your internal business purposes during the subscription term.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.3" title="Your Data Ownership">
          <p>
            You retain all ownership rights to the data and content you upload to the Platform ("Your Data"). 
            By uploading Your Data, you grant us a limited license to host, store, process, and display 
            Your Data solely for the purpose of providing and improving our Services.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.4" title="Feedback">
          <p>
            Any feedback, suggestions, or ideas you provide regarding the Platform may be used by us 
            without any obligation to compensate you or maintain confidentiality.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="user-content" number="6" title="User Content & Data" titleAr="محتوى المستخدم والبيانات">
        <LegalSubSection number="6.1" title="Responsibility for Content">
          <p>
            You are solely responsible for the accuracy, quality, integrity, legality, and intellectual 
            property rights of all content you upload or submit to the Platform. We do not endorse any 
            user content and disclaim any liability arising from user content.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.2" title="Data Retention">
          <p>
            We will retain Your Data for the duration of your subscription and for a reasonable period 
            thereafter to allow for data export. Specific retention periods for certain types of data 
            (e.g., incident records, audit logs) may be longer to comply with regulatory requirements. 
            Please refer to our Privacy Policy for detailed information.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.3" title="Data Export">
          <p>
            You may export Your Data at any time during your subscription. Upon termination, you will 
            have 30 days to export Your Data before it is permanently deleted, unless longer retention 
            is required by law.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="service-limitations" number="7" title="Service Limitations" titleAr="قيود الخدمة">
        <LegalSubSection number="7.1" title="Availability">
          <p>
            We strive to maintain high availability of the Platform. However, we do not guarantee 
            uninterrupted access. The Platform may be unavailable due to maintenance, updates, or 
            circumstances beyond our control. Enterprise plan subscribers are entitled to specific 
            uptime commitments as outlined in their Service Level Agreement.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.2" title="Feature Availability">
          <p>
            Not all features are available on all subscription plans. Feature availability is determined 
            by your selected plan and may change over time. We reserve the right to modify, add, or 
            remove features with reasonable notice.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.3" title="Third-Party Services">
          <p>
            The Platform may integrate with third-party services. We are not responsible for the 
            availability, accuracy, or content of third-party services. Your use of third-party 
            services is subject to their respective terms and conditions.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="liability" number="8" title="Liability & Warranties" titleAr="المسؤولية والضمانات">
        <LegalSubSection number="8.1" title="Disclaimer of Warranties">
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF 
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT 
            WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, UNINTERRUPTED, OR FREE OF HARMFUL COMPONENTS.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.2" title="Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DHUUUS AND ITS AFFILIATES, OFFICERS, DIRECTORS, 
            EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, 
            USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.
          </p>
          <p className="mt-2">
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT 
            YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.3" title="Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless Dhuuus and its affiliates from and 
            against any claims, damages, losses, costs, and expenses (including reasonable legal fees) 
            arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your 
            violation of any third-party rights; or (d) your content.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.4" title="Force Majeure">
          <p>
            We shall not be liable for any failure or delay in performance due to circumstances beyond 
            our reasonable control, including but not limited to acts of God, natural disasters, war, 
            terrorism, strikes, government actions, or failures of third-party services.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="termination" number="9" title="Termination" titleAr="الإنهاء">
        <LegalSubSection number="9.1" title="Termination by You">
          <p>
            You may terminate your subscription at any time through your account settings or by 
            contacting our support team. Termination will be effective at the end of your current 
            billing period. No refunds will be provided for partial periods unless otherwise specified 
            in our Refund Policy.
          </p>
        </LegalSubSection>
        <LegalSubSection number="9.2" title="Termination by Us">
          <p>We may terminate or suspend your account immediately, without prior notice, if:</p>
          <LegalList
            items={[
              "You breach any provision of these Terms",
              "You fail to pay applicable fees when due",
              "Your use of the Platform poses a security risk or may harm other users",
              "We are required to do so by law or legal process",
              "We discontinue the Platform or your subscription plan",
            ]}
          />
        </LegalSubSection>
        <LegalSubSection number="9.3" title="Effect of Termination">
          <p>Upon termination:</p>
          <LegalList
            items={[
              "Your right to access and use the Platform will immediately cease",
              "You will have 30 days to export Your Data (unless terminated for breach)",
              "We may delete Your Data after the export period, except as required by law",
              "Provisions that by their nature should survive termination will survive (e.g., liability limitations, dispute resolution)",
              "Any outstanding fees will become immediately due and payable",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="governing-law" number="10" title="Governing Law & Disputes" titleAr="القانون الحاكم والنزاعات">
        <LegalSubSection number="10.1" title="Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Kingdom 
            of Saudi Arabia, without regard to its conflict of law principles.
          </p>
        </LegalSubSection>
        <LegalSubSection number="10.2" title="Dispute Resolution">
          <p>
            Any dispute arising out of or relating to these Terms or the Platform shall first be 
            attempted to be resolved through good-faith negotiations between the parties for a period 
            of thirty (30) days.
          </p>
          <p className="mt-2">
            If the dispute cannot be resolved through negotiation, it shall be finally settled by 
            arbitration administered by the Saudi Center for Commercial Arbitration (SCCA) in 
            accordance with its arbitration rules. The arbitration shall be conducted in Riyadh, 
            Saudi Arabia, in the Arabic language (with English translation available upon request).
          </p>
        </LegalSubSection>
        <LegalSubSection number="10.3" title="Class Action Waiver">
          <p>
            YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL 
            BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
          </p>
        </LegalSubSection>
        <LegalSubSection number="10.4" title="Contact Information">
          <p>For questions or concerns about these Terms, please contact us at:</p>
          <div className="mt-2 p-4 bg-muted rounded-lg">
            <p><strong>Dhuuus Legal Department</strong></p>
            <p>Email: legal@dhuuus.com</p>
            <p>Address: Riyadh, Kingdom of Saudi Arabia</p>
          </div>
        </LegalSubSection>
      </LegalSection>

      <div className="mt-12 p-6 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          By using the Dhuuus Platform, you acknowledge that you have read, understood, and agree 
          to be bound by these Terms of Service. If you do not agree to these Terms, please do not 
          use our Platform.
        </p>
      </div>
    </LegalPageLayout>
  );
}
