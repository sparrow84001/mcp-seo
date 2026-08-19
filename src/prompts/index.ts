export const MCP_PROMPTS = {
  seo_full_audit: {
    name: 'seo_full_audit',
    description: 'Execute a full 12-step SEO, AEO, GEO, Local, Content, Technical & Conversion audit on a codebase or URL.',
    arguments: [
      {
        name: 'target',
        description: 'Directory path to the website codebase or a live URL (https://...) to audit.',
        required: true
      }
    ]
  },
  seo_code_fix_workflow: {
    name: 'seo_code_fix_workflow',
    description: 'Guide through safe, surgical code fixes with diff previews and validation.',
    arguments: [
      {
        name: 'filePath',
        description: 'Path to the source code file to fix.',
        required: true
      },
      {
        name: 'issueType',
        description: 'Type of issue to fix (e.g., missing_title, missing_canonical, add_faq_schema, local_business_schema).',
        required: true
      }
    ]
  },
  aeo_geo_optimization: {
    name: 'aeo_geo_optimization',
    description: 'Audit and optimize content for AI Answer Engines (Perplexity, ChatGPT, AI Overviews) and LLM discovery (llms.txt).',
    arguments: [
      {
        name: 'target',
        description: 'Path or URL of the target page.',
        required: true
      }
    ]
  },
  local_seo_boost: {
    name: 'local_seo_boost',
    description: 'Audit and optimize local landing pages, NAP consistency, and LocalBusiness schema for map pack rankings.',
    arguments: [
      {
        name: 'target',
        description: 'Target location page or project root.',
        required: true
      }
    ]
  }
};
