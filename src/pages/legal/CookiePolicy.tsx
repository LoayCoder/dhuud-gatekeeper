import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "what-are-cookies", number: "1", title: "What Are Cookies?" },
  { id: "cookies-we-use", number: "2", title: "Cookies We Use" },
  { id: "third-party", number: "3", title: "Third-Party Cookies" },
  { id: "managing-cookies", number: "4", title: "Managing Cookies" },
  { id: "do-not-track", number: "5", title: "Do Not Track Signals" },
  { id: "updates", number: "6", title: "Policy Updates" },
  { id: "contact", number: "7", title: "Contact Us" },
];

export default function CookiePolicy() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      titleAr="سياسة ملفات تعريف الارتباط"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          This Cookie Policy explains how Dhuuus uses cookies and similar technologies when you 
          visit our platform. By continuing to use our platform, you consent to our use of cookies 
          as described in this policy.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="what-are-cookies" number="1" title="What Are Cookies?" titleAr="ما هي ملفات تعريف الارتباط؟">
        <p>
          Cookies are small text files that are placed on your device (computer, smartphone, or 
          tablet) when you visit a website or use an application. They are widely used to make 
          websites work more efficiently, provide a better user experience, and give website 
          operators information about how their site is being used.
        </p>
        <p>
          We also use similar technologies such as local storage, session storage, and pixels 
          that function in a similar way to cookies. In this policy, we use the term "cookies" 
          to refer to all these technologies.
        </p>
      </LegalSection>

      <LegalSection id="cookies-we-use" number="2" title="Cookies We Use" titleAr="ملفات تعريف الارتباط التي نستخدمها">
        <LegalSubSection number="2.1" title="Essential Cookies (Strictly Necessary)">
          <p>
            These cookies are necessary for the Platform to function properly. They enable core 
            functionality such as security, authentication, and session management. You cannot 
            opt out of these cookies as the Platform would not work without them.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Cookie Name</th>
                  <th className="p-3 text-start border-b">Purpose</th>
                  <th className="p-3 text-start border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">sb-access-token</td>
                  <td className="p-3">Authentication session token</td>
                  <td className="p-3">Session</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">sb-refresh-token</td>
                  <td className="p-3">Session refresh token</td>
                  <td className="p-3">7 days</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">dhuuus_session</td>
                  <td className="p-3">Session management</td>
                  <td className="p-3">Session</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">csrf_token</td>
                  <td className="p-3">Security - prevents cross-site request forgery</td>
                  <td className="p-3">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="2.2" title="Functional Cookies">
          <p>
            These cookies enable enhanced functionality and personalization, such as remembering 
            your preferences and settings.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Cookie Name</th>
                  <th className="p-3 text-start border-b">Purpose</th>
                  <th className="p-3 text-start border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">i18nextLng</td>
                  <td className="p-3">Language preference (Arabic/English)</td>
                  <td className="p-3">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">theme</td>
                  <td className="p-3">Dark/Light mode preference</td>
                  <td className="p-3">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">sidebar_collapsed</td>
                  <td className="p-3">Navigation sidebar state</td>
                  <td className="p-3">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">notification_preferences</td>
                  <td className="p-3">Notification settings</td>
                  <td className="p-3">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="2.3" title="Analytics Cookies">
          <p>
            These cookies help us understand how visitors interact with our Platform by collecting 
            and reporting information anonymously. This helps us improve our services.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Cookie Name</th>
                  <th className="p-3 text-start border-b">Purpose</th>
                  <th className="p-3 text-start border-b">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">dhuuus_analytics</td>
                  <td className="p-3">Feature usage tracking</td>
                  <td className="p-3">30 days</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-mono text-xs">session_id</td>
                  <td className="p-3">Session analytics</td>
                  <td className="p-3">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="2.4" title="Performance Cookies">
          <p>
            These cookies collect information about how you use the Platform, such as which pages 
            you visit most often and if you experience errors. This data helps us optimize the 
            Platform's performance.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="third-party" number="3" title="Third-Party Cookies" titleAr="ملفات تعريف الارتباط الخاصة بأطراف ثالثة">
        <p>
          Some cookies on our Platform are set by third-party services that we use to enhance 
          functionality:
        </p>
        
        <LegalSubSection number="3.1" title="Payment Processing">
          <p>
            Stripe may set cookies when you interact with payment functionality for subscription 
            billing. These cookies are subject to Stripe's privacy policy.
          </p>
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Error Tracking">
          <p>
            We may use error tracking services that set cookies to help us identify and fix 
            technical issues.
          </p>
        </LegalSubSection>

        <p className="mt-4">
          We do not use advertising or tracking cookies, and we do not share cookie data with 
          advertisers or data brokers.
        </p>
      </LegalSection>

      <LegalSection id="managing-cookies" number="4" title="Managing Cookies" titleAr="إدارة ملفات تعريف الارتباط">
        <LegalSubSection number="4.1" title="Browser Settings">
          <p>
            You can control and manage cookies through your browser settings. Most browsers allow you to:
          </p>
          <LegalList
            items={[
              "View cookies stored on your device",
              "Delete all or specific cookies",
              "Block all or certain types of cookies",
              "Set preferences for different websites",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.2" title="Browser-Specific Instructions">
          <LegalList
            items={[
              "Chrome: Settings > Privacy and Security > Cookies and other site data",
              "Firefox: Settings > Privacy & Security > Cookies and Site Data",
              "Safari: Preferences > Privacy > Manage Website Data",
              "Edge: Settings > Privacy, Search, and Services > Cookies",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="4.3" title="Impact of Disabling Cookies">
          <p>
            Please note that if you disable essential cookies, you may not be able to use certain 
            features of the Platform, including logging in to your account. Disabling functional 
            cookies may result in reduced personalization and convenience.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="do-not-track" number="5" title="Do Not Track Signals" titleAr="إشارات عدم التتبع">
        <p>
          Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you 
          do not want your online activity tracked. Currently, there is no universal standard for 
          how websites should respond to DNT signals. Our Platform does not currently respond to 
          DNT signals, but we limit our tracking to the purposes described in this policy.
        </p>
      </LegalSection>

      <LegalSection id="updates" number="6" title="Policy Updates" titleAr="تحديثات السياسة">
        <p>
          We may update this Cookie Policy from time to time. When we make changes, we will 
          update the "Last Updated" date at the top of this page. We encourage you to review 
          this policy periodically to stay informed about our use of cookies.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="7" title="Contact Us" titleAr="اتصل بنا">
        <p>
          If you have questions about our use of cookies, please contact us:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p>Email: privacy@dhuuus.com</p>
          <p>Subject: Cookie Policy Inquiry</p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
