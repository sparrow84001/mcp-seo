import type {
  BacklinkDirectoryProspect,
  CompetitorArchetype,
  EntityKnowledgeGraphSuggestion,
  IndustryNicheProfile,
  IndustryVertical,
  KeywordTopicCluster,
  PageData,
  ProjectDiscoveryResult,
  RelatedEcosystemResult
} from '../types/index.ts';

export function suggestRelatedEcosystem(
  target: string,
  pageData: PageData,
  discovery?: ProjectDiscoveryResult
): RelatedEcosystemResult {
  const nicheProfile = inferIndustryNiche(pageData, discovery);
  const primaryTopic = extractPrimaryTopic(pageData);

  const competitorArchetypes = getCompetitorArchetypes(nicheProfile.vertical, primaryTopic);
  const authorityDirectoryProspects = getDirectoryAndBacklinkProspects(nicheProfile.vertical, pageData.pageType);
  const keywordTopicClusters = getKeywordTopicClusters(nicheProfile.vertical, primaryTopic);
  const knowledgeGraphSuggestions = getEntityKnowledgeGraphSuggestions(nicheProfile.vertical, primaryTopic);

  const strategicGrowthAdvice = [
    `Establish entity authority by linking Organization/Product schema to verified ${nicheProfile.vertical.replace(/-/g, ' ')} entities on Wikidata and Crunchbase.`,
    `Build targeted comparison landing pages ("${primaryTopic} vs Top Alternatives") to capture high-intent MoFu evaluation searches.`,
    `Secure primary citations and reviews on top authority platforms (${authorityDirectoryProspects.slice(0, 3).map((p) => p.platformName).join(', ')}).`,
    `Publish definitive 40-60 word direct answer blocks for key conversational queries to gain AI Overview and Perplexity citations.`
  ];

  return {
    timestamp: new Date().toISOString(),
    target,
    nicheProfile,
    competitorArchetypes,
    authorityDirectoryProspects,
    keywordTopicClusters,
    knowledgeGraphSuggestions,
    strategicGrowthAdvice
  };
}

function extractPrimaryTopic(pageData: PageData): string {
  if (pageData.title) {
    const cleanTitle = pageData.title.split(/[-|–:•]/)[0]?.trim();
    if (cleanTitle && cleanTitle.length >= 3) return cleanTitle;
  }
  const h1 = pageData.headings.find((h) => h.level === 1)?.text;
  if (h1 && h1.length >= 3) return h1.trim();
  return 'Core Solution / Product';
}

function inferIndustryNiche(pageData: PageData, discovery?: ProjectDiscoveryResult): IndustryNicheProfile {
  const corpus = [
    pageData.title,
    pageData.metaDescription,
    ...pageData.headings.map((h) => h.text),
    ...(discovery?.detectedRoutes || []).map((r) => r.path)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let vertical: IndustryVertical = 'general-business';
  let primaryNiche = 'Business & Commercial Services';
  let targetAudienceType: 'B2B' | 'B2C' | 'B2B2C' | 'Enterprise' | 'Local Consumers' = 'B2B';
  let valueDrivers: string[] = ['Reliability', 'Efficiency', 'Customer Service'];

  if (/\b(api|sdk|cli|mcp|cloud|dev|developer|ai|agent|code|database|framework|analytics|software|saas|app)\b/i.test(corpus)) {
    vertical = 'b2b-saas-devtools';
    primaryNiche = 'Developer Tools, AI & Cloud SaaS';
    targetAudienceType = 'B2B';
    valueDrivers = ['Developer Experience (DX)', 'Performance & Scalability', 'API Reliability', 'AI Integration'];
  } else if (/\b(shop|store|cart|checkout|shipping|product|apparel|shoes|clothing|ecommerce|retail|order)\b/i.test(corpus)) {
    vertical = 'ecommerce-retail';
    primaryNiche = 'E-Commerce & Digital Retail';
    targetAudienceType = 'B2C';
    valueDrivers = ['Fast Shipping', 'Hassle-Free Returns', 'Customer Reviews', 'Competitive Pricing'];
  } else if (/\b(agency|consulting|marketing|seo|design|web development|creative|branding|portfolio|case study)\b/i.test(corpus)) {
    vertical = 'agency-professional-services';
    primaryNiche = 'Digital Growth, SEO & Technology Agency';
    targetAudienceType = 'B2B';
    valueDrivers = ['Proven ROI', 'Client Case Studies', 'Full-Cycle Execution', 'Strategic Expertise'];
  } else if (/\b(plumber|electrician|roofing|repair|clean|locksmith|contractor|hvac|mechanic|pest)\b/i.test(corpus) || pageData.pageType === 'location' || pageData.pageType === 'city') {
    vertical = 'local-home-services';
    primaryNiche = 'Local & On-Demand Home Services';
    targetAudienceType = 'Local Consumers';
    valueDrivers = ['Same-Day Availability', 'Transparent Pricing', 'Verified Local Reviews', 'Licensed & Insured'];
  } else if (/\b(bank|loan|mortgage|payment|crypto|wallet|invest|fintech|insurance|wealth|trading)\b/i.test(corpus)) {
    vertical = 'fintech-finance';
    primaryNiche = 'Financial Technology & Wealth Management';
    targetAudienceType = 'B2B2C';
    valueDrivers = ['Bank-Grade Security', 'Regulatory Compliance', 'Frictionless Payments', 'Low Fees'];
  } else if (/\b(health|doctor|clinic|therapy|medical|patient|dental|hospital|wellness|fitness)\b/i.test(corpus)) {
    vertical = 'healthcare-wellness';
    primaryNiche = 'Healthcare, Medical & Wellness Services';
    targetAudienceType = 'B2C';
    valueDrivers = ['Board-Certified Care', 'Patient Trust & Privacy', 'Online Booking', 'Holistic Outcomes'];
  } else if (/\b(course|academy|training|tutorial|university|student|edtech|learn|certification)\b/i.test(corpus)) {
    vertical = 'education-edtech';
    primaryNiche = 'Education, Online Learning & Upskilling';
    targetAudienceType = 'B2C';
    valueDrivers = ['Industry-Recognized Certification', 'Hands-On Projects', 'Self-Paced Flexibility', 'Mentor Support'];
  } else if (/\b(real estate|realty|property|rent|homes|apartments|condos|realtor|brokerage)\b/i.test(corpus)) {
    vertical = 'real-estate-property';
    primaryNiche = 'Real Estate & Property Investment';
    targetAudienceType = 'B2C';
    valueDrivers = ['Verified MLS Listings', 'Virtual 3D Tours', 'Local Market Expertise', 'Seamless Escrow'];
  }

  const positioningSummary = `Classified as ${primaryNiche} (${targetAudienceType} model). Target search behavior focuses on ${valueDrivers.slice(0, 2).join(' and ')}.`;

  return {
    vertical,
    primaryNiche,
    targetAudienceType,
    marketPositioningSummary: positioningSummary,
    inferredValueDrivers: valueDrivers
  };
}

function getCompetitorArchetypes(vertical: IndustryVertical, primaryTopic: string): CompetitorArchetype[] {
  switch (vertical) {
    case 'b2b-saas-devtools':
      return [
        {
          category: 'Market Leader / Benchmark',
          archetypeName: 'Established Industry Standard Platform',
          typicalDomainExample: 'github.com / vercel.com / datadog.com',
          whatTheyDoWell: 'Massive brand equity, extensive documentation, developer community ecosystems.',
          howToOutrankOrDifferentiate: `Emphasize superior speed, specialized focus on "${primaryTopic}", simpler transparent pricing, and zero vendor lock-in.`
        },
        {
          category: 'Direct Competitor',
          archetypeName: 'High-Growth Modern SaaS Alternative',
          typicalDomainExample: 'linear.app / supabase.com / postman.com',
          whatTheyDoWell: 'Polished UI/UX, viral bottom-up developer adoption, active public changelogs.',
          howToOutrankOrDifferentiate: `Create explicit "[Your Product] vs [Competitor]" comparison pages highlighting unique architectural advantages and benchmark metrics.`
        },
        {
          category: 'Niche Alternative / Challenger',
          archetypeName: 'Open-Source or Privacy-First Challenger',
          typicalDomainExample: 'self-hosted GitHub projects / tool-specific open source repos',
          whatTheyDoWell: 'Open code transparency, privacy-conscious appeal, self-hosting flexibility.',
          howToOutrankOrDifferentiate: `Provide turnkey managed hosted solutions, enterprise SLAs, and automated compliance alongside open standard compatibility.`
        }
      ];

    case 'ecommerce-retail':
      return [
        {
          category: 'Market Leader / Benchmark',
          archetypeName: 'Dominant Category Retailer',
          typicalDomainExample: 'amazon.com / target.com / shopify-top-brands.com',
          whatTheyDoWell: 'Massive product inventory, next-day logistics, extensive customer review volume.',
          howToOutrankOrDifferentiate: `Target ultra-specific long-tail buyer intent, curated boutique quality, and rich editorial guides with schema-rich product data.`
        },
        {
          category: 'Direct Competitor',
          archetypeName: 'Direct-To-Consumer (DTC) Brand Leader',
          typicalDomainExample: 'allbirds.com / gymshark.com',
          whatTheyDoWell: 'Strong visual storytelling, social media influencer virality, high-converting product pages.',
          howToOutrankOrDifferentiate: `Optimize Product and Offer schema, display real-time stock and bundle discounts, and lower shipping friction.`
        }
      ];

    case 'agency-professional-services':
      return [
        {
          category: 'Market Leader / Benchmark',
          archetypeName: 'Tier-1 Global Enterprise Agency',
          typicalDomainExample: 'accenture.com / vml.com / publicissapient.com',
          whatTheyDoWell: 'Enterprise trust, multinational presence, multi-million dollar corporate contracts.',
          howToOutrankOrDifferentiate: `Highlight agility, direct founder-level involvement, transparent sprint pricing, and rapid time-to-market.`
        },
        {
          category: 'Direct Competitor',
          archetypeName: 'Boutique High-Performance Agency',
          typicalDomainExample: 'metalab.com / locomotive.ca / directiveconsulting.com',
          whatTheyDoWell: 'Stunning design aesthetics, measurable growth case studies, verified Clutch/G2 ratings.',
          howToOutrankOrDifferentiate: `Publish detailed breakdown case studies with verifiable data, transparent deliverables, and specialized local or industry focus.`
        }
      ];

    case 'local-home-services':
      return [
        {
          category: 'Market Leader / Benchmark',
          archetypeName: 'National Home Service Aggregator',
          typicalDomainExample: 'angi.com / thumbtack.com / yelp.com',
          whatTheyDoWell: 'Massive domain authority, localized directory pages for every postal code.',
          howToOutrankOrDifferentiate: `Win Google Map Pack with 100% complete LocalBusiness schema, true local phone numbers, verified Google Business Profile, and genuine neighborhood photos.`
        },
        {
          category: 'Direct Competitor',
          archetypeName: 'Top-Rated Local Competitor',
          typicalDomainExample: 'top-rated-city-service.com',
          whatTheyDoWell: '100+ 5-star Google reviews, prominent click-to-call mobile floating buttons.',
          howToOutrankOrDifferentiate: `Add instant booking widgets, emergency response time guarantees (e.g. "Arrives in 45 mins"), and specific neighborhood landing pages with unique local content.`
        }
      ];

    default:
      return [
        {
          category: 'Market Leader / Benchmark',
          archetypeName: 'Global Category Leader',
          typicalDomainExample: 'industry-leader.com',
          whatTheyDoWell: 'High domain authority, comprehensive backlink portfolio, strong brand search volume.',
          howToOutrankOrDifferentiate: `Target under-served niche queries, optimize direct answers for AI search engines, and provide frictionless onboarding.`
        },
        {
          category: 'Direct Competitor',
          archetypeName: 'Direct Category Competitor',
          typicalDomainExample: 'category-competitor.com',
          whatTheyDoWell: 'Focused offerings, competitive pricing, active content marketing.',
          howToOutrankOrDifferentiate: `Deliver superior page speed, structured data coverage, and high-contrast conversion channels.`
        }
      ];
  }
}

function getDirectoryAndBacklinkProspects(vertical: IndustryVertical, pageType?: string): BacklinkDirectoryProspect[] {
  const commonProspects: BacklinkDirectoryProspect[] = [
    {
      platformName: 'Google Business Profile',
      urlOrDomain: 'business.google.com',
      category: 'High-DA Citation',
      importance: 'Essential',
      recommendedListingAction: 'Claim and verify profile, set primary categories, add direct website booking URL.'
    },
    {
      platformName: 'Crunchbase',
      urlOrDomain: 'crunchbase.com',
      category: 'High-DA Citation',
      importance: 'High',
      recommendedListingAction: 'Create verified company entity profile with founders, funding, and official website URL for Knowledge Graph recognition.'
    },
    {
      platformName: 'Trustpilot',
      urlOrDomain: 'trustpilot.com',
      category: 'Review Platform',
      importance: 'High',
      recommendedListingAction: 'Set up free company review page and embed verified trust badge widgets on landing pages.'
    }
  ];

  const verticalProspects: Record<IndustryVertical, BacklinkDirectoryProspect[]> = {
    'b2b-saas-devtools': [
      {
        platformName: 'ProductHunt',
        urlOrDomain: 'producthunt.com',
        category: 'Community / Showcase',
        importance: 'Essential',
        recommendedListingAction: 'Prepare launch campaign with demo video, screenshots, and special promotional offer.'
      },
      {
        platformName: 'G2 / Capterra',
        urlOrDomain: 'g2.com / capterra.com',
        category: 'Review Platform',
        importance: 'Essential',
        recommendedListingAction: 'Claim SaaS product profile, request early user reviews to rank in category grid comparison reports.'
      },
      {
        platformName: 'AlternativeTo',
        urlOrDomain: 'alternativeto.net',
        category: 'Industry Directory',
        importance: 'High',
        recommendedListingAction: 'Submit software as an alternative to major category leaders to capture comparison searches.'
      },
      {
        platformName: 'Awesome Lists (GitHub)',
        urlOrDomain: 'github.com/topics/awesome',
        category: 'Community / Showcase',
        importance: 'High',
        recommendedListingAction: 'Submit PR to relevant curated Awesome repositories in your technology niche.'
      }
    ],
    'ecommerce-retail': [
      {
        platformName: 'Google Merchant Center',
        urlOrDomain: 'merchants.google.com',
        category: 'High-DA Citation',
        importance: 'Essential',
        recommendedListingAction: 'Upload automated XML product feed for free Google Shopping tab listings.'
      },
      {
        platformName: 'Shopify App Store / Directory',
        urlOrDomain: 'apps.shopify.com',
        category: 'Industry Directory',
        importance: 'High',
        recommendedListingAction: 'Integrate with partner ecosystem catalogs and marketplace backlinks.'
      }
    ],
    'agency-professional-services': [
      {
        platformName: 'Clutch.co',
        urlOrDomain: 'clutch.co',
        category: 'Review Platform',
        importance: 'Essential',
        recommendedListingAction: 'Complete full verified profile, submit client interview references for top city agency rankings.'
      },
      {
        platformName: 'DesignRush / Manifest',
        urlOrDomain: 'designrush.com',
        category: 'Industry Directory',
        importance: 'High',
        recommendedListingAction: 'Submit agency portfolio case studies and service capabilities.'
      }
    ],
    'local-home-services': [
      {
        platformName: 'Yelp for Business',
        urlOrDomain: 'biz.yelp.com',
        category: 'Review Platform',
        importance: 'Essential',
        recommendedListingAction: 'Claim business listing, verify NAP (Name, Address, Phone) consistency with website footer.'
      },
      {
        platformName: 'Better Business Bureau (BBB)',
        urlOrDomain: 'bbb.org',
        category: 'High-DA Citation',
        importance: 'High',
        recommendedListingAction: 'Register local business profile to enhance domain trust and E-E-A-T score.'
      },
      {
        platformName: 'Angi / Thumbtack / Nextdoor',
        urlOrDomain: 'angi.com / nextdoor.com',
        category: 'Review Platform',
        importance: 'Essential',
        recommendedListingAction: 'Claim local neighborhood service radius profiles.'
      }
    ],
    'fintech-finance': [
      {
        platformName: 'Fintech Weekly / Sifted',
        urlOrDomain: 'sifted.eu / fintechweekly.com',
        category: 'Industry Directory',
        importance: 'High',
        recommendedListingAction: 'Submit product profile and press releases to fintech database editors.'
      }
    ],
    'healthcare-wellness': [
      {
        platformName: 'Zocdoc / Healthgrades',
        urlOrDomain: 'zocdoc.com / healthgrades.com',
        category: 'Industry Directory',
        importance: 'Essential',
        recommendedListingAction: 'Claim practitioner profiles and synchronize clinic operating hours.'
      }
    ],
    'education-edtech': [
      {
        platformName: 'Class Central / CourseReport',
        urlOrDomain: 'classcentral.com / coursereport.com',
        category: 'Review Platform',
        importance: 'Essential',
        recommendedListingAction: 'List curriculum, course ratings, and graduate success case studies.'
      }
    ],
    'real-estate-property': [
      {
        platformName: 'Zillow / Realtor.com',
        urlOrDomain: 'zillow.com / realtor.com',
        category: 'Industry Directory',
        importance: 'Essential',
        recommendedListingAction: 'Sync broker and agent directory profiles with direct IDX links.'
      }
    ],
    'media-publishing': [
      {
        platformName: 'Google News / Google Publisher Center',
        urlOrDomain: 'publishercenter.google.com',
        category: 'High-DA Citation',
        importance: 'Essential',
        recommendedListingAction: 'Submit publication feed for Google News inclusion and Top Stories carousels.'
      }
    ],
    'general-business': []
  };

  return [...commonProspects, ...(verticalProspects[vertical] || [])];
}

function getKeywordTopicClusters(vertical: IndustryVertical, primaryTopic: string): KeywordTopicCluster[] {
  return [
    {
      clusterTheme: `1. Direct Competitor & Alternative Comparisons`,
      sampleSearchQueries: [
        `${primaryTopic} vs alternatives in 2026`,
        `Best ${primaryTopic} competitors for businesses`,
        `Why choose ${primaryTopic} over traditional solutions`
      ],
      contentAngle: 'Objective comparison tables with feature matrices, pricing breakdowns, and benchmark results.',
      searchIntent: 'commercial',
      conversionPotential: 'High'
    },
    {
      clusterTheme: `2. Problem-Solving & Implementation Tutorials`,
      sampleSearchQueries: [
        `How to solve [core problem] with ${primaryTopic}`,
        `Step by step guide to setup and configure ${primaryTopic}`,
        `${primaryTopic} best practices and common pitfalls to avoid`
      ],
      contentAngle: 'Actionable step-by-step guides with direct answers (40-60 words) under H2/H3 question headers.',
      searchIntent: 'informational',
      conversionPotential: 'Medium'
    },
    {
      clusterTheme: `3. Pricing, Cost & ROI Evaluation`,
      sampleSearchQueries: [
        `How much does ${primaryTopic} cost in 2026`,
        `${primaryTopic} pricing plans and enterprise calculator`,
        `ROI of implementing ${primaryTopic} for teams`
      ],
      contentAngle: 'Transparent pricing breakdown with FAQ accordions and risk-reversal guarantees.',
      searchIntent: 'transactional',
      conversionPotential: 'High'
    },
    {
      clusterTheme: `4. Industry Trends & Future Outlook`,
      sampleSearchQueries: [
        `Future of ${primaryTopic} and AI integration`,
        `Top industry benchmarks and statistics for ${primaryTopic}`,
        `${primaryTopic} compliance, security, and standards`
      ],
      contentAngle: 'Thought-leadership whitepapers and data-driven benchmark reports to earn natural editorial backlinks.',
      searchIntent: 'informational',
      conversionPotential: 'Medium'
    }
  ];
}

function getEntityKnowledgeGraphSuggestions(vertical: IndustryVertical, primaryTopic: string): EntityKnowledgeGraphSuggestion[] {
  return [
    {
      entityName: primaryTopic,
      recommendedSchemaType: vertical === 'local-home-services' ? 'LocalBusiness' : vertical === 'b2b-saas-devtools' ? 'SoftwareApplication' : 'Organization',
      sameAsCandidates: [
        'https://www.wikidata.org/wiki/[Your_Wikidata_Entity_ID]',
        'https://www.linkedin.com/company/[your-company]',
        'https://www.crunchbase.com/organization/[your-organization]'
      ],
      contextReasoning: 'Connecting your Schema.org JSON-LD to authoritative external entity profiles enables Google Knowledge Graph and AI search engines to reconcile your brand with certainty.'
    }
  ];
}

export function formatEcosystemToMarkdown(ecosystem: RelatedEcosystemResult): string {
  return `# 🌐 Related Web Ecosystem, Niche & Competitor Intelligence

**Target:** \`${ecosystem.target}\`  
**Analyzed At:** ${ecosystem.timestamp}  
**Detected Vertical:** \`${ecosystem.nicheProfile.vertical.toUpperCase()}\` (${ecosystem.nicheProfile.primaryNiche})  
**Audience Model:** **${ecosystem.nicheProfile.targetAudienceType}**

---

## 🎯 Market Niche & Positioning Profile
* **Summary:** ${ecosystem.nicheProfile.marketPositioningSummary}
* **Core Value Drivers:** ${ecosystem.nicheProfile.inferredValueDrivers.map((d) => `\`${d}\``).join(' • ')}

---

## 🏆 Competitor Archetypes & Benchmark Landscape

| Archetype Category | Example Benchmark | What They Do Well | How To Differentiate & Outrank |
| :--- | :--- | :--- | :--- |
${ecosystem.competitorArchetypes
  .map(
    (c) => `| **${c.category}** (${c.archetypeName}) | \`${c.typicalDomainExample}\` | ${c.whatTheyDoWell} | ${c.howToOutrankOrDifferentiate} |`
  )
  .join('\n')}

---

## 🔗 High-Authority Directories & Backlink Prospects

| Platform | Domain | Category | Importance | Action Item |
| :--- | :--- | :---: | :---: | :--- |
${ecosystem.authorityDirectoryProspects
  .map(
    (p) => `| **${p.platformName}** | \`${p.urlOrDomain}\` | ${p.category} | \`${p.importance}\` | ${p.recommendedListingAction} |`
  )
  .join('\n')}

---

## 💡 High-Intent Keyword Topic Clusters & Content Strategy

${ecosystem.keywordTopicClusters
  .map(
    (k) => `### ${k.clusterTheme} (Intent: \`${k.searchIntent.toUpperCase()}\` • Conversion: \`${k.conversionPotential}\`)
* **Target Query Ideas:**
${k.sampleSearchQueries.map((q) => `  - 🔍 *"${q}"*`).join('\n')}
* **Recommended Content Angle:** ${k.contentAngle}`
  )
  .join('\n\n')}

---

## 🧠 Entity Knowledge Graph & GEO Suggestions

${ecosystem.knowledgeGraphSuggestions
  .map(
    (kg) => `* **Primary Entity:** \`${kg.entityName}\` (Schema: \`${kg.recommendedSchemaType}\`)
  - **sameAs Verification Targets:** ${kg.sameAsCandidates.map((s) => `\`${s}\``).join(', ')}
  - **Strategic Value:** ${kg.contextReasoning}`
  )
  .join('\n')}

---

## 📈 Strategic Growth Action Items

${ecosystem.strategicGrowthAdvice.map((advice, i) => `${i + 1}. ${advice}`).join('\n')}
`;
}
