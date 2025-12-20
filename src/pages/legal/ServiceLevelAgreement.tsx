import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalList } from "@/components/legal/LegalSection";
import { TableOfContents } from "@/components/legal/TableOfContents";

const tocItems = [
  { id: "overview", number: "1", title: "Overview" },
  { id: "uptime", number: "2", title: "Uptime Commitment" },
  { id: "support", number: "3", title: "Support Services" },
  { id: "response-times", number: "4", title: "Response Times" },
  { id: "maintenance", number: "5", title: "Scheduled Maintenance" },
  { id: "service-credits", number: "6", title: "Service Credits" },
  { id: "exclusions", number: "7", title: "Exclusions" },
  { id: "monitoring", number: "8", title: "Monitoring & Reporting" },
  { id: "contact", number: "9", title: "Contact" },
];

export default function ServiceLevelAgreement() {
  return (
    <LegalPageLayout
      title="Service Level Agreement"
      titleAr="اتفاقية مستوى الخدمة"
      lastUpdated="December 20, 2025"
      effectiveDate="December 20, 2025"
      version="1.0"
    >
      <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm">
          This Service Level Agreement ("SLA") describes the service levels that Dhuuus commits 
          to providing for our HSSE management platform. This SLA is incorporated into and 
          subject to our Terms of Service.
        </p>
      </div>

      <TableOfContents items={tocItems} />

      <LegalSection id="overview" number="1" title="Overview" titleAr="نظرة عامة">
        <p>
          Dhuuus is committed to providing reliable, high-quality HSSE management services. 
          This SLA outlines our commitments for service availability, performance, and support, 
          as well as the remedies available if we fail to meet these commitments.
        </p>
        <p>
          Service levels vary by subscription plan. Enterprise customers may negotiate custom 
          SLA terms as part of their service agreement.
        </p>
      </LegalSection>

      <LegalSection id="uptime" number="2" title="Uptime Commitment" titleAr="التزام التشغيل">
        <LegalSubSection number="2.1" title="Monthly Uptime Target">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Plan</th>
                  <th className="p-3 text-start border-b">Uptime Target</th>
                  <th className="p-3 text-start border-b">Maximum Downtime/Month</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">Starter</td>
                  <td className="p-3">99.0%</td>
                  <td className="p-3">~7.3 hours</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Professional</td>
                  <td className="p-3">99.5%</td>
                  <td className="p-3">~3.6 hours</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Enterprise</td>
                  <td className="p-3">99.9%</td>
                  <td className="p-3">~43 minutes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="2.2" title="Uptime Calculation">
          <p>
            Monthly uptime percentage is calculated as:
          </p>
          <div className="mt-2 p-4 bg-muted rounded font-mono text-sm">
            ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) × 100
          </div>
          <p className="mt-4">
            "Downtime" means the period during which the platform's core features are 
            substantially unavailable, as measured by our monitoring systems.
          </p>
        </LegalSubSection>

        <LegalSubSection number="2.3" title="Core Features">
          <p>The following are considered core features covered by the uptime commitment:</p>
          <LegalList
            items={[
              "User authentication and login",
              "Incident reporting and management",
              "Inspection creation and completion",
              "Visitor check-in/check-out",
              "Dashboard and reporting access",
              "API access for integrations",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="support" number="3" title="Support Services" titleAr="خدمات الدعم">
        <LegalSubSection number="3.1" title="Support Channels">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Channel</th>
                  <th className="p-3 text-start border-b">Starter</th>
                  <th className="p-3 text-start border-b">Professional</th>
                  <th className="p-3 text-start border-b">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">Email Support</td>
                  <td className="p-3">✓</td>
                  <td className="p-3">✓</td>
                  <td className="p-3">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">In-App Support</td>
                  <td className="p-3">✓</td>
                  <td className="p-3">✓</td>
                  <td className="p-3">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Priority Queue</td>
                  <td className="p-3">—</td>
                  <td className="p-3">✓</td>
                  <td className="p-3">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Phone Support</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Dedicated Account Manager</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">24/7 Emergency Support</td>
                  <td className="p-3">—</td>
                  <td className="p-3">—</td>
                  <td className="p-3">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="3.2" title="Support Hours">
          <LegalList
            items={[
              "Standard Support: Sunday - Thursday, 9:00 AM - 6:00 PM (Arabia Standard Time)",
              "Extended Support (Professional): Sunday - Thursday, 8:00 AM - 8:00 PM AST",
              "24/7 Support (Enterprise): Available for critical issues",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="response-times" number="4" title="Response Times" titleAr="أوقات الاستجابة">
        <LegalSubSection number="4.1" title="Issue Severity Levels">
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
              <p className="font-semibold text-destructive">Critical (Severity 1)</p>
              <p className="text-sm">Platform completely unavailable or major feature broken affecting all users</p>
            </div>
            <div className="p-3 bg-warning/10 border border-warning/20 rounded">
              <p className="font-semibold text-warning">High (Severity 2)</p>
              <p className="text-sm">Major feature degraded or unavailable, affecting many users, no workaround</p>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded">
              <p className="font-semibold text-primary">Medium (Severity 3)</p>
              <p className="text-sm">Feature impaired but workaround available, limited user impact</p>
            </div>
            <div className="p-3 bg-muted border border-border rounded">
              <p className="font-semibold">Low (Severity 4)</p>
              <p className="text-sm">Minor issues, questions, feature requests, documentation</p>
            </div>
          </div>
        </LegalSubSection>

        <LegalSubSection number="4.2" title="Response Time Targets">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Severity</th>
                  <th className="p-3 text-start border-b">Starter</th>
                  <th className="p-3 text-start border-b">Professional</th>
                  <th className="p-3 text-start border-b">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Critical</td>
                  <td className="p-3">4 hours</td>
                  <td className="p-3">1 hour</td>
                  <td className="p-3">15 minutes</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">High</td>
                  <td className="p-3">8 hours</td>
                  <td className="p-3">4 hours</td>
                  <td className="p-3">1 hour</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Medium</td>
                  <td className="p-3">24 hours</td>
                  <td className="p-3">8 hours</td>
                  <td className="p-3">4 hours</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Low</td>
                  <td className="p-3">48 hours</td>
                  <td className="p-3">24 hours</td>
                  <td className="p-3">8 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Response times are measured during support hours unless 24/7 support is included.
          </p>
        </LegalSubSection>

        <LegalSubSection number="4.3" title="Resolution Targets">
          <p>
            While response times are guaranteed, resolution times depend on issue complexity. 
            We commit to providing regular updates until resolution:
          </p>
          <LegalList
            items={[
              "Critical: Updates every 30 minutes until resolved",
              "High: Updates every 2 hours",
              "Medium: Updates every 24 hours",
              "Low: Updates as progress is made",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="maintenance" number="5" title="Scheduled Maintenance" titleAr="الصيانة المجدولة">
        <LegalSubSection number="5.1" title="Maintenance Windows">
          <p>
            Standard maintenance window: Thursdays, 11:00 PM - 2:00 AM AST (Friday early morning)
          </p>
          <p className="mt-2">
            We schedule maintenance during low-usage periods to minimize impact. Most maintenance 
            is performed with zero downtime using rolling deployments.
          </p>
        </LegalSubSection>

        <LegalSubSection number="5.2" title="Notification">
          <LegalList
            items={[
              "Standard maintenance: 7 days advance notice",
              "Emergency maintenance: As much notice as reasonably possible",
              "Notifications via email, in-app banner, and status page",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="5.3" title="Exclusion from Downtime">
          <p>
            Scheduled maintenance within the designated window does not count toward downtime 
            calculations for SLA purposes, provided:
          </p>
          <LegalList
            items={[
              "Advance notice was provided as required",
              "Maintenance duration does not exceed 4 hours",
              "Total scheduled maintenance does not exceed 8 hours per month",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="service-credits" number="6" title="Service Credits" titleAr="أرصدة الخدمة">
        <LegalSubSection number="6.1" title="Credit Calculation">
          <p>
            If we fail to meet our uptime commitment, you may be eligible for service credits 
            applied to your next billing cycle:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start border-b">Monthly Uptime</th>
                  <th className="p-3 text-start border-b">Service Credit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3">&lt; Target but ≥ 99.0%</td>
                  <td className="p-3">10% of monthly fee</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">&lt; 99.0% but ≥ 95.0%</td>
                  <td className="p-3">25% of monthly fee</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">&lt; 95.0%</td>
                  <td className="p-3">50% of monthly fee</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSubSection>

        <LegalSubSection number="6.2" title="Credit Request Process">
          <LegalList
            ordered
            items={[
              "Submit a credit request within 30 days of the incident",
              "Include affected dates and description of the outage",
              "Requests should be sent to sla@dhuuus.com",
              "Credits are applied within 60 days of approved request",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="6.3" title="Maximum Credits">
          <p>
            Service credits are capped at 50% of your monthly subscription fee per month. 
            Credits are not redeemable for cash and cannot be transferred.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="exclusions" number="7" title="Exclusions" titleAr="الاستثناءات">
        <p>
          The following events are excluded from uptime calculations and do not qualify 
          for service credits:
        </p>
        <LegalList
          items={[
            "Scheduled maintenance within designated windows with proper notice",
            "Force majeure events (natural disasters, war, acts of terrorism)",
            "Issues caused by customer actions or third-party services outside our control",
            "Internet connectivity issues outside our infrastructure",
            "DNS issues beyond our nameservers",
            "Browser or client-side issues",
            "Issues resulting from customer's failure to implement recommended configurations",
            "Alpha, beta, or preview features not designated as production-ready",
            "Free tier accounts",
            "Periods where the customer is in breach of Terms of Service",
          ]}
        />
      </LegalSection>

      <LegalSection id="monitoring" number="8" title="Monitoring & Reporting" titleAr="المراقبة والتقارير">
        <LegalSubSection number="8.1" title="Status Page">
          <p>
            Real-time service status is available at our status page, which displays:
          </p>
          <LegalList
            items={[
              "Current operational status of all services",
              "Active incidents and their status",
              "Scheduled maintenance windows",
              "Historical uptime data",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="8.2" title="Incident Communication">
          <p>
            During incidents, we provide updates through:
          </p>
          <LegalList
            items={[
              "Status page updates",
              "Email notifications to affected customers",
              "In-app notifications where possible",
            ]}
          />
        </LegalSubSection>

        <LegalSubSection number="8.3" title="Post-Incident Reports">
          <p>
            For significant incidents (Severity 1 or 2), we provide post-incident reports 
            within 5 business days, including:
          </p>
          <LegalList
            items={[
              "Timeline of the incident",
              "Root cause analysis",
              "Impact assessment",
              "Remediation steps taken",
              "Preventive measures implemented",
            ]}
          />
        </LegalSubSection>
      </LegalSection>

      <LegalSection id="contact" number="9" title="Contact" titleAr="التواصل">
        <p>For support and SLA-related inquiries:</p>
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p><strong>General Support:</strong> support@dhuuus.com</p>
          <p><strong>SLA Credits:</strong> sla@dhuuus.com</p>
          <p><strong>Emergency (Enterprise):</strong> Available through dedicated support channel</p>
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
