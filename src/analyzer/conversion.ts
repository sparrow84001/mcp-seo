import type { AuditIssue, PageData } from '../types/index.ts';

export function auditConversion(page: PageData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const isConversionCandidate = ['homepage', 'service', 'product', 'landing', 'pricing'].includes(page.pageType);
  if (!isConversionCandidate) {
    return issues;
  }

  const rawHtml = page.rawHtml || '';
  const text = page.extractedText.toLowerCase();

  // 1. Primary Call-To-Action (CTA) Check
  const hasCtaButton =
    /<button|<a[^>]+class="[^"]*(btn|button|cta|action)[^"]*"|contact us|get started|book a call|get a quote|schedule|start free trial|buy now|hire us/i.test(
      rawHtml
    );

  if (!hasCtaButton) {
    issues.push({
      id: 'CRO_NO_PRIMARY_CTA',
      dimension: 'conversion',
      title: 'Missing Prominent Call-to-Action (CTA) Button',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.5,
      evidence: `No distinct primary CTA button or conversion anchor detected on ${page.pageType} page.`,
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Without a clear, high-contrast primary CTA above the fold and at the conclusion of content, visitors fail to take action, resulting in wasted organic traffic and low lead volume.',
      recommendedSolution: 'Add a prominent, high-contrast primary CTA button (e.g., "Request a Quote", "Schedule Consultation").',
      implementationApproach: 'Insert CTA hero section button and a sticky/bottom conversion banner.',
      expectedImpact: 'Directly improves visitor-to-lead conversion rate.',
      effort: 'low'
    });
  }

  // 2. Lead Capture / Contact Options (Form, WhatsApp, Click-to-Call)
  const hasForm = /<form/i.test(rawHtml);
  const hasWhatsApp = /wa\.me|api\.whatsapp\.com/i.test(rawHtml);
  const hasTel = /href=["']tel:/i.test(rawHtml);
  const hasMailto = /href=["']mailto:/i.test(rawHtml);

  if (!hasForm && !hasWhatsApp && !hasTel && !hasMailto) {
    issues.push({
      id: 'CRO_NO_DIRECT_CONTACT_CHANNEL',
      dimension: 'conversion',
      title: 'No Direct Lead Capture Form or Instant Contact Channel',
      severity: 'high',
      priority: 'P1',
      priorityScore: 8.0,
      evidence: 'No <form>, click-to-call (tel:), WhatsApp link, or contact option detected on page.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Friction in reaching the business is the #1 cause of bounce before conversion. Offering only a navigation link to a separate contact page introduces drop-off.',
      recommendedSolution: 'Embed an inline 3-field contact/lead form or quick WhatsApp/Phone floating action button.',
      implementationApproach: 'Add an embedded lead capture form or quick WhatsApp chat button.',
      expectedImpact: 'Reduces conversion friction and accelerates inbound inquiry velocity.',
      effort: 'low'
    });
  }

  // 3. Social Proof & Risk Reversal (Guarantees, Testimonials)
  const hasSocialProof = /testimonial|review|case study|results|rating|trusted by|clients/i.test(text);
  const hasRiskReversal = /guarantee|cancel anytime|no risk|money-back|free trial|warranty/i.test(text);

  if (!hasSocialProof && page.pageType === 'landing') {
    issues.push({
      id: 'CRO_NO_SOCIAL_PROOF_LANDING',
      dimension: 'conversion',
      title: 'Landing Page Missing Dedicated Social Proof Section',
      severity: 'medium',
      priority: 'P2',
      priorityScore: 7.0,
      evidence: 'No testimonials, customer quotes, or client logo proof blocks detected on landing page.',
      evidenceType: 'confirmed',
      filePath: page.filePath,
      whyItMatters:
        'Landing pages without verified customer testimonials or client logos experience lower conversion rates due to lack of social validation.',
      recommendedSolution: 'Add 2-3 customer testimonials with headshots, names, and measurable outcomes.',
      implementationApproach: 'Add a testimonial grid component above the final conversion CTA.',
      expectedImpact: 'Increases conversion confidence and reduces bounce rate.',
      effort: 'medium'
    });
  }

  if (!hasRiskReversal && (page.pageType === 'pricing' || page.pageType === 'landing')) {
    issues.push({
      id: 'CRO_NO_RISK_REVERSAL',
      dimension: 'conversion',
      title: 'Missing Risk-Reversal Offer (Guarantee / Free Trial / Assurance)',
      severity: 'low',
      priority: 'P3',
      priorityScore: 5.0,
      evidence: 'No guarantee, warranty, or risk-free trial phrasing found on high-intent conversion page.',
      evidenceType: 'inferred',
      filePath: page.filePath,
      whyItMatters:
        'Providing explicit risk reversal (e.g., "100% Satisfaction Guarantee", "Cancel Anytime", "No Credit Card Required") overcomes the final objection threshold.',
      recommendedSolution: 'Include explicit risk-reversal messaging near the payment/submit action.',
      implementationApproach: 'Add a trust badge and guarantee statement below the primary CTA.',
      expectedImpact: 'Reduces checkout/form abandonment.',
      effort: 'low'
    });
  }

  return issues;
}
