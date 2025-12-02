/**
 * BOO Auto-Fixer Agent
 *
 * Analyzes performance issues and generates fix recommendations
 * for BigCommerce-specific optimizations.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../config/agent-config.json'), 'utf8'));
const thresholds = JSON.parse(readFileSync(join(__dirname, '../config/thresholds.json'), 'utf8'));

// BigCommerce-specific fix library
const FIX_LIBRARY = {
  // Image Optimization Fixes
  'uses-responsive-images': {
    category: 'images',
    priority: 'high',
    title: 'Use Responsive Images',
    description: 'Serve appropriately-sized images for each device',
    bigcommerceSpecific: true,
    fix: {
      type: 'stencil-template',
      instructions: [
        'Use {{getImageSrcset}} helper in Stencil templates',
        'Add sizes attribute to img tags',
        'Implement srcset with multiple image sizes',
        'Use BigCommerce CDN image resizing parameters'
      ],
      codeExample: `
<!-- Before -->
<img src="{{getImage product.main_image 'original'}}">

<!-- After -->
<img
  src="{{getImage product.main_image 'product_size'}}"
  srcset="
    {{getImage product.main_image '100w'}} 100w,
    {{getImage product.main_image '200w'}} 200w,
    {{getImage product.main_image '500w'}} 500w,
    {{getImage product.main_image '1000w'}} 1000w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  alt="{{product.name}}"
>`,
      estimatedImpact: 'LCP: -500ms to -2s'
    }
  },

  'offscreen-images': {
    category: 'images',
    priority: 'high',
    title: 'Defer Offscreen Images',
    description: 'Lazy-load below-the-fold images',
    bigcommerceSpecific: true,
    fix: {
      type: 'stencil-template',
      instructions: [
        'Add loading="lazy" to images below the fold',
        'Do NOT lazy-load LCP images (hero, first product)',
        'Consider using IntersectionObserver for complex cases'
      ],
      codeExample: `
<!-- Product grid images (lazy load) -->
<img
  src="{{getImage product.main_image 'product_size'}}"
  loading="lazy"
  alt="{{product.name}}"
>

<!-- Hero image (do not lazy load - LCP element) -->
<img
  src="{{getImage carousel.image 'original'}}"
  fetchpriority="high"
  alt="{{carousel.alt}}"
>`,
      estimatedImpact: 'Page weight: -30-50%'
    }
  },

  'uses-optimized-images': {
    category: 'images',
    priority: 'high',
    title: 'Efficiently Encode Images',
    description: 'Use WebP format and optimal compression',
    bigcommerceSpecific: true,
    fix: {
      type: 'cdn-config',
      instructions: [
        'BigCommerce CDN automatically serves WebP to supported browsers',
        'Ensure images uploaded at optimal quality (80-85% JPEG)',
        'Use appropriate image sizes for each context',
        'Consider compressing images before upload'
      ],
      codeExample: `
# BigCommerce CDN automatically handles WebP conversion
# Use image parameters for size optimization:

# Small thumbnail (100px)
{{getImage image '100w'}}

# Product listing (500px)
{{getImage image '500w'}}

# Product page main (1000px)
{{getImage image '1000w'}}`,
      estimatedImpact: 'Page weight: -20-40%'
    }
  },

  // JavaScript Optimization Fixes
  'render-blocking-resources': {
    category: 'scripts',
    priority: 'critical',
    title: 'Eliminate Render-Blocking Resources',
    description: 'Defer non-critical JavaScript and CSS',
    bigcommerceSpecific: true,
    fix: {
      type: 'stencil-template',
      instructions: [
        'Add defer attribute to non-critical scripts',
        'Move scripts to end of body where possible',
        'Inline critical CSS for above-the-fold content',
        'Use async for analytics and third-party scripts'
      ],
      codeExample: `
<!-- In layout/base.html -->
<!-- Critical CSS inlined in head -->
<style>
  /* Above-fold critical styles only */
  .header, .hero, .nav { /* styles */ }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="{{cdn 'theme.css'}}" as="style" onload="this.rel='stylesheet'">

<!-- Defer scripts -->
<script defer src="{{cdn 'theme.bundle.js'}}"></script>

<!-- Async for third-party -->
<script async src="https://www.googletagmanager.com/gtag/js"></script>`,
      estimatedImpact: 'FCP: -500ms to -1s, TBT: -200ms'
    }
  },

  'unused-javascript': {
    category: 'scripts',
    priority: 'high',
    title: 'Remove Unused JavaScript',
    description: 'Reduce JavaScript bundle size',
    bigcommerceSpecific: true,
    fix: {
      type: 'stencil-config',
      instructions: [
        'Audit installed apps for unused scripts',
        'Remove unused BigCommerce features in config',
        'Code-split JavaScript by page type',
        'Use dynamic imports for feature-specific code'
      ],
      codeExample: `
// In assets/js/theme/global.js
// Use dynamic imports for page-specific features

if (document.querySelector('.product-view')) {
  import('./product').then(module => module.default());
}

if (document.querySelector('.cart-page')) {
  import('./cart').then(module => module.default());
}

// stencil.conf.js - enable bundle splitting
module.exports = {
  features: {
    code_splitting: true
  }
}`,
      estimatedImpact: 'TBT: -100-300ms, TTI: -500ms'
    }
  },

  'mainthread-work-breakdown': {
    category: 'scripts',
    priority: 'high',
    title: 'Minimize Main Thread Work',
    description: 'Reduce JavaScript execution time',
    bigcommerceSpecific: false,
    fix: {
      type: 'code-optimization',
      instructions: [
        'Break up long-running tasks',
        'Use requestIdleCallback for non-critical work',
        'Debounce event handlers',
        'Consider using Web Workers for heavy computation'
      ],
      codeExample: `
// Break up long tasks
function processItems(items) {
  const CHUNK_SIZE = 10;
  let index = 0;

  function processChunk() {
    const chunk = items.slice(index, index + CHUNK_SIZE);
    chunk.forEach(item => processItem(item));
    index += CHUNK_SIZE;

    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }

  requestIdleCallback(processChunk);
}

// Debounce scroll handler
const debouncedScroll = debounce(() => {
  // scroll logic
}, 100);
window.addEventListener('scroll', debouncedScroll, { passive: true });`,
      estimatedImpact: 'TBT: -100-500ms'
    }
  },

  // Third-Party Script Fixes
  'third-party-summary': {
    category: 'thirdParty',
    priority: 'high',
    title: 'Reduce Third-Party Impact',
    description: 'Optimize or defer third-party scripts',
    bigcommerceSpecific: true,
    fix: {
      type: 'script-management',
      instructions: [
        'Audit all BigCommerce apps for performance impact',
        'Remove unused apps from store',
        'Defer chat widgets until user interaction',
        'Use facade pattern for heavy embeds (YouTube, etc.)'
      ],
      codeExample: `
// Defer chat widget until user shows intent
let chatLoaded = false;

function loadChat() {
  if (chatLoaded) return;
  chatLoaded = true;

  const script = document.createElement('script');
  script.src = 'https://chat-widget.example.com/widget.js';
  document.body.appendChild(script);
}

// Load on scroll (user engagement)
window.addEventListener('scroll', loadChat, { once: true, passive: true });

// Load on click intent
document.addEventListener('click', loadChat, { once: true });

// Load after 5 seconds as fallback
setTimeout(loadChat, 5000);`,
      estimatedImpact: 'TBT: -200-500ms, TTI: -1s'
    }
  },

  // Font Optimization Fixes
  'font-display': {
    category: 'fonts',
    priority: 'medium',
    title: 'Ensure Text Remains Visible During Font Load',
    description: 'Use font-display: swap for custom fonts',
    bigcommerceSpecific: true,
    fix: {
      type: 'css',
      instructions: [
        'Add font-display: swap to @font-face declarations',
        'Preload critical fonts',
        'Consider using system fonts for body text'
      ],
      codeExample: `
/* In assets/scss/settings/foundation/type/_settings.scss */
@font-face {
  font-family: 'CustomFont';
  src: url('{{cdn "fonts/custom.woff2"}}') format('woff2');
  font-display: swap;
  font-weight: 400;
}

/* Preload in head */
<link rel="preload" href="{{cdn 'fonts/custom.woff2'}}" as="font" type="font/woff2" crossorigin>

/* Use system fonts as fallback */
body {
  font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}`,
      estimatedImpact: 'FCP: -100-300ms, CLS: reduced'
    }
  },

  // Layout Shift Fixes
  'layout-shift-elements': {
    category: 'layout',
    priority: 'high',
    title: 'Avoid Large Layout Shifts',
    description: 'Prevent unexpected layout shifts',
    bigcommerceSpecific: true,
    fix: {
      type: 'css-html',
      instructions: [
        'Add width and height attributes to all images',
        'Use aspect-ratio CSS for responsive containers',
        'Reserve space for ads/embeds before they load',
        'Avoid inserting content above existing content'
      ],
      codeExample: `
<!-- Add dimensions to images -->
<img
  src="{{getImage product.main_image '500w'}}"
  width="500"
  height="500"
  alt="{{product.name}}"
>

/* Reserve space with aspect-ratio */
.product-image-container {
  aspect-ratio: 1 / 1;
  background-color: #f0f0f0;
}

/* Reserve space for ads */
.ad-container {
  min-height: 250px;
  background-color: #f0f0f0;
}`,
      estimatedImpact: 'CLS: -0.05 to -0.15'
    }
  },

  // Server/Caching Fixes
  'uses-long-cache-ttl': {
    category: 'caching',
    priority: 'medium',
    title: 'Serve Static Assets with Efficient Cache Policy',
    description: 'Use long cache lifetimes for static resources',
    bigcommerceSpecific: true,
    fix: {
      type: 'config',
      instructions: [
        'BigCommerce CDN handles caching automatically',
        'Ensure assets use versioned filenames',
        'Use cache-busting for updated resources'
      ],
      codeExample: `
// BigCommerce automatically adds cache headers to CDN assets
// Use content hashing in Stencil for cache busting

// stencil.conf.js
module.exports = {
  production: {
    bundle: {
      filename: '[name].[contenthash].js'
    }
  }
};

// Reference with CDN helper (automatic versioning)
<script src="{{cdn 'theme.bundle.js'}}"></script>`,
      estimatedImpact: 'Repeat visit load: -50-80%'
    }
  },

  // Resource Hints
  'uses-rel-preconnect': {
    category: 'resourceHints',
    priority: 'medium',
    title: 'Preconnect to Required Origins',
    description: 'Establish early connections to important origins',
    bigcommerceSpecific: true,
    fix: {
      type: 'html-head',
      instructions: [
        'Add preconnect hints for third-party origins',
        'Add dns-prefetch as fallback',
        'Prioritize origins that deliver LCP resources'
      ],
      codeExample: `
<!-- In templates/layout/base.html <head> -->

<!-- Critical third-party connections -->
<link rel="preconnect" href="https://cdn11.bigcommerce.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Analytics (lower priority) -->
<link rel="dns-prefetch" href="https://www.google-analytics.com">
<link rel="dns-prefetch" href="https://www.googletagmanager.com">

<!-- If using external chat/reviews -->
<link rel="dns-prefetch" href="https://chat.example.com">`,
      estimatedImpact: 'LCP: -100-300ms'
    }
  }
};

export class AutoFixerAgent {
  constructor(options = {}) {
    this.name = 'Auto-Fixer Agent';
    this.version = '1.0.0';
    this.supabase = null;
    this.fixLibrary = FIX_LIBRARY;
    this.options = {
      autoApply: config.agents.autoFixer.autoApply || false,
      requireApproval: config.agents.autoFixer.requireApproval || true,
      ...options
    };
  }

  async initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log(chalk.green('✓ Auto-Fixer Agent initialized'));
    } else {
      console.log(chalk.yellow('⚠ Running in offline mode'));
    }
  }

  /**
   * Analyze audit results and generate fix recommendations
   */
  analyzeAuditResults(auditResults) {
    const recommendations = [];

    for (const result of auditResults) {
      if (result.error) continue;

      for (const audit of result.failingAudits || []) {
        const fix = this.fixLibrary[audit.id];
        if (fix) {
          recommendations.push({
            auditId: audit.id,
            pageId: result.pageId,
            pageName: result.pageName,
            device: result.device,
            currentScore: audit.score,
            displayValue: audit.displayValue,
            ...fix,
            appliedAt: null,
            status: 'pending'
          });
        }
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.currentScore || 0) - (b.currentScore || 0);
    });

    // Deduplicate by auditId (same fix applies across pages)
    const uniqueRecommendations = [];
    const seenAudits = new Set();
    for (const rec of recommendations) {
      if (!seenAudits.has(rec.auditId)) {
        seenAudits.add(rec.auditId);
        uniqueRecommendations.push(rec);
      }
    }

    return uniqueRecommendations;
  }

  /**
   * Generate a prioritized fix plan
   */
  generateFixPlan(recommendations) {
    const plan = {
      generated: new Date().toISOString(),
      totalRecommendations: recommendations.length,
      byCategory: {},
      byPriority: { critical: [], high: [], medium: [], low: [] },
      estimatedTotalImpact: {
        lcp: '0ms',
        tbt: '0ms',
        cls: '0'
      },
      phases: []
    };

    // Group by category and priority
    for (const rec of recommendations) {
      if (!plan.byCategory[rec.category]) {
        plan.byCategory[rec.category] = [];
      }
      plan.byCategory[rec.category].push(rec);
      plan.byPriority[rec.priority].push(rec);
    }

    // Create phased implementation plan
    plan.phases = [
      {
        name: 'Phase 1: Critical Fixes',
        description: 'Address critical issues blocking performance',
        fixes: plan.byPriority.critical,
        estimatedTime: '1-2 hours'
      },
      {
        name: 'Phase 2: High-Impact Fixes',
        description: 'Implement high-impact optimizations',
        fixes: plan.byPriority.high,
        estimatedTime: '2-4 hours'
      },
      {
        name: 'Phase 3: Medium Priority',
        description: 'Additional optimizations for fine-tuning',
        fixes: plan.byPriority.medium,
        estimatedTime: '1-2 hours'
      },
      {
        name: 'Phase 4: Low Priority',
        description: 'Polish and minor improvements',
        fixes: plan.byPriority.low,
        estimatedTime: '1 hour'
      }
    ].filter(phase => phase.fixes.length > 0);

    return plan;
  }

  /**
   * Print fix recommendations to console
   */
  printRecommendations(recommendations) {
    console.log(chalk.blue('\n🔧 Fix Recommendations:\n'));

    const priorityColors = {
      critical: chalk.red,
      high: chalk.yellow,
      medium: chalk.cyan,
      low: chalk.gray
    };

    for (const rec of recommendations) {
      const color = priorityColors[rec.priority] || chalk.white;
      console.log(color(`[${rec.priority.toUpperCase()}] ${rec.title}`));
      console.log(`  Category: ${rec.category}`);
      console.log(`  ${rec.description}`);
      if (rec.fix.estimatedImpact) {
        console.log(chalk.green(`  Estimated Impact: ${rec.fix.estimatedImpact}`));
      }
      console.log('');
    }

    console.log(chalk.blue(`Total: ${recommendations.length} recommendations\n`));
  }

  /**
   * Get fix details by audit ID
   */
  getFixDetails(auditId) {
    return this.fixLibrary[auditId] || null;
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(recommendations) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('boo_fix_history')
        .insert(recommendations.map(rec => ({
          audit_id: rec.auditId,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          fix_details: rec.fix,
          status: 'pending',
          created_at: new Date().toISOString()
        })));

      if (error) {
        console.log(chalk.yellow(`⚠ Failed to save recommendations: ${error.message}`));
      } else {
        console.log(chalk.green('✓ Recommendations saved to database'));
      }
    } catch (err) {
      console.log(chalk.yellow(`⚠ Database error: ${err.message}`));
    }
  }

  /**
   * Generate BigCommerce-specific optimization checklist
   */
  generateBigCommerceChecklist() {
    return {
      title: 'BigCommerce Performance Optimization Checklist',
      categories: [
        {
          name: 'Images',
          items: [
            { task: 'Enable WebP delivery via BigCommerce CDN', priority: 'high' },
            { task: 'Use getImage helper with srcset for responsive images', priority: 'high' },
            { task: 'Add loading="lazy" to below-fold images', priority: 'high' },
            { task: 'Add width/height attributes to prevent CLS', priority: 'medium' },
            { task: 'Compress images before upload (80-85% quality)', priority: 'medium' }
          ]
        },
        {
          name: 'JavaScript',
          items: [
            { task: 'Add defer to non-critical scripts', priority: 'critical' },
            { task: 'Move scripts to end of body', priority: 'high' },
            { task: 'Remove unused BigCommerce apps', priority: 'high' },
            { task: 'Implement code splitting in Stencil', priority: 'medium' },
            { task: 'Defer third-party widgets until interaction', priority: 'high' }
          ]
        },
        {
          name: 'CSS',
          items: [
            { task: 'Inline critical CSS for above-fold content', priority: 'high' },
            { task: 'Defer non-critical stylesheets', priority: 'high' },
            { task: 'Remove unused CSS', priority: 'medium' },
            { task: 'Add font-display: swap to custom fonts', priority: 'medium' }
          ]
        },
        {
          name: 'Third-Party',
          items: [
            { task: 'Audit installed apps for performance impact', priority: 'high' },
            { task: 'Defer chat widget until user interaction', priority: 'high' },
            { task: 'Use facade pattern for video embeds', priority: 'medium' },
            { task: 'Add preconnect hints for critical origins', priority: 'medium' }
          ]
        },
        {
          name: 'Server/CDN',
          items: [
            { task: 'Ensure all assets served via BigCommerce CDN', priority: 'high' },
            { task: 'Enable Gzip/Brotli compression', priority: 'medium' },
            { task: 'Review and optimize redirect chains', priority: 'medium' }
          ]
        }
      ]
    };
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const agent = new AutoFixerAgent();

  (async () => {
    try {
      await agent.initialize();

      if (process.argv.includes('--checklist')) {
        const checklist = agent.generateBigCommerceChecklist();
        console.log(JSON.stringify(checklist, null, 2));
      } else if (process.argv.includes('--library')) {
        console.log(JSON.stringify(agent.fixLibrary, null, 2));
      } else {
        // Demo with sample failing audits
        const sampleResults = [{
          pageId: 'homepage',
          pageName: 'Homepage',
          device: 'mobile',
          failingAudits: [
            { id: 'render-blocking-resources', score: 0.4, displayValue: '1.2s' },
            { id: 'uses-responsive-images', score: 0.5, displayValue: '500 KB' },
            { id: 'offscreen-images', score: 0.6, displayValue: '300 KB' }
          ]
        }];

        const recommendations = agent.analyzeAuditResults(sampleResults);
        agent.printRecommendations(recommendations);

        const plan = agent.generateFixPlan(recommendations);
        console.log('\n📋 Fix Plan:');
        console.log(JSON.stringify(plan.phases.map(p => ({ name: p.name, fixCount: p.fixes.length })), null, 2));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  })();
}

export default AutoFixerAgent;
