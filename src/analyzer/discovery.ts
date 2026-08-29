import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type {
  FrameworkType,
  PageType,
  ProjectDiscoveryResult
} from '../types/index.ts';

/**
 * High-performance file scanner leveraging Bun.Glob when running on Bun runtime,
 * with seamless fallback to fast-glob.
 */
export function scanFiles(
  patterns: string[],
  options: { cwd: string; ignore?: string[] }
): string[] {
  const results = new Set<string>();
  const ignorePatterns = options.ignore || ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**', '**/.git/**'];

  if (typeof Bun !== 'undefined' && (Bun as any).Glob) {
    try {
      for (const pattern of patterns) {
        const glob = new (Bun as any).Glob(pattern);
        for (const file of glob.scanSync({ cwd: options.cwd, dot: false })) {
          const normalized = String(file).replace(/\\/g, '/');
          const isIgnored = ignorePatterns.some((ig) => {
            const clean = ig.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, '');
            return normalized.includes(clean);
          });
          if (!isIgnored) {
            results.add(normalized);
          }
        }
      }
      return Array.from(results);
    } catch {
      // Fallback to fast-glob
    }
  }

  return fg.sync(patterns, {
    cwd: options.cwd,
    ignore: ignorePatterns
  });
}

export async function discoverProject(projectPath: string): Promise<ProjectDiscoveryResult> {
  const normalizedPath = path.resolve(projectPath);
  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Project path does not exist: ${normalizedPath}`);
  }

  // 1. Detect Framework
  const frameworkInfo = detectFramework(normalizedPath);

  // 2. Discover Sitemaps, Robots, LLMs.txt
  const sitemaps = scanFiles(['**/sitemap*.{xml,ts,js}', '**/sitemap-index.xml'], {
    cwd: normalizedPath,
    ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**']
  });

  const robots = scanFiles(['**/robots.{txt,ts,js}'], {
    cwd: normalizedPath,
    ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**']
  });

  const llms = scanFiles(['**/llms*.txt'], {
    cwd: normalizedPath,
    ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**']
  });

  // 3. Detect Meta Helpers & Layouts
  const metaHelpers = scanFiles(
    [
      '**/layouts/**/*.{blade.php,tsx,jsx,vue,astro,svelte,php}',
      '**/app/**/layout.{tsx,jsx,js}',
      '**/pages/_document.{tsx,jsx}',
      '**/pages/_app.{tsx,jsx}',
      '**/includes/header.{php,html}',
      '**/components/Seo*.{tsx,jsx,vue,svelte,astro}',
      '**/components/Meta*.{tsx,jsx,vue,svelte,astro}',
      '**/components/Head*.{tsx,jsx,vue,svelte,astro}'
    ],
    {
      cwd: normalizedPath,
      ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**']
    }
  );

  // 4. Detect Routes & Pages
  const routes = detectRoutes(normalizedPath, frameworkInfo.type);

  // 5. Build Page Inventory
  const pageInventory: Record<PageType, number> = {
    homepage: 0,
    service: 0,
    product: 0,
    category: 0,
    location: 0,
    area: 0,
    city: 0,
    state: 0,
    blog: 0,
    article: 0,
    landing: 0,
    pricing: 0,
    comparison: 0,
    faq: 0,
    contact: 0,
    about: 0,
    author: 0,
    tag: 0,
    search: 0,
    pagination: 0,
    dynamic: 0,
    api: 0,
    unknown: 0
  };

  for (const r of routes) {
    pageInventory[r.pageType] = (pageInventory[r.pageType] || 0) + 1;
  }

  const allFiles = scanFiles(['**/*.{php,blade.php,tsx,jsx,vue,astro,svelte,html}'], {
    cwd: normalizedPath,
    ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/.next/**', '**/.git/**']
  });

  return {
    projectPath: normalizedPath,
    framework: frameworkInfo.type,
    frameworkDetails: {
      name: frameworkInfo.name,
      version: frameworkInfo.version,
      templateEngine: frameworkInfo.templateEngine,
      routingModel: frameworkInfo.routingModel,
      metaHandler: frameworkInfo.metaHandler
    },
    detectedRoutes: routes,
    sitemapFiles: sitemaps,
    robotsTxtFiles: robots,
    llmsTxtFiles: llms,
    pageInventory,
    metaHelperLocations: metaHelpers,
    totalScannedFiles: allFiles.length
  };
}

function detectFramework(projectPath: string): {
  type: FrameworkType;
  name: string;
  version?: string;
  templateEngine?: string;
  routingModel?: string;
  metaHandler?: string;
} {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const composerJsonPath = path.join(projectPath, 'composer.json');
  const artisanPath = path.join(projectPath, 'artisan');

  // Check Laravel
  if (fs.existsSync(artisanPath) || fs.existsSync(composerJsonPath)) {
    if (fs.existsSync(composerJsonPath)) {
      try {
        const composer = JSON.parse(fs.readFileSync(composerJsonPath, 'utf8'));
        if (composer.require?.['laravel/framework'] || composer['require-dev']?.['laravel/framework'] || fs.existsSync(artisanPath)) {
          return {
            type: 'laravel',
            name: 'Laravel',
            version: composer.require?.['laravel/framework'] || '10/11',
            templateEngine: 'Blade (@extends, @section, @yield, Blade Components)',
            routingModel: 'routes/web.php (Controller/Closure routes)',
            metaHandler: 'Blade layouts (resources/views/layouts/app.blade.php) & SEO components'
          };
        }
      } catch {
        // Continue
      }
    }
  }

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      // Next.js (App Router vs Pages Router)
      if (deps['next']) {
        const hasAppDir = fs.existsSync(path.join(projectPath, 'app')) || fs.existsSync(path.join(projectPath, 'src/app'));
        const hasPagesDir = fs.existsSync(path.join(projectPath, 'pages')) || fs.existsSync(path.join(projectPath, 'src/pages'));

        if (hasAppDir) {
          return {
            type: 'nextjs-app',
            name: 'Next.js (App Router)',
            version: deps['next'],
            templateEngine: 'React Server/Client Components (TSX/JSX)',
            routingModel: 'File-system based (app/**/page.tsx)',
            metaHandler: 'Next.js Metadata API (export const metadata / generateMetadata)'
          };
        }

        if (hasPagesDir) {
          return {
            type: 'nextjs-pages',
            name: 'Next.js (Pages Router)',
            version: deps['next'],
            templateEngine: 'React Components (TSX/JSX)',
            routingModel: 'File-system based (pages/**/*.tsx)',
            metaHandler: 'next/head (<Head> component)'
          };
        }

        return {
          type: 'nextjs-app',
          name: 'Next.js',
          version: deps['next'],
          templateEngine: 'React TSX/JSX',
          routingModel: 'File-system based'
        };
      }

      // Astro
      if (deps['astro']) {
        return {
          type: 'astro',
          name: 'Astro',
          version: deps['astro'],
          templateEngine: 'Astro components (.astro)',
          routingModel: 'File-system based (src/pages/**/*.astro)',
          metaHandler: 'Astro Head components / frontmatter'
        };
      }

      // SvelteKit
      if (deps['@sveltejs/kit']) {
        return {
          type: 'sveltekit',
          name: 'SvelteKit',
          version: deps['@sveltejs/kit'],
          templateEngine: 'Svelte Components (.svelte)',
          routingModel: 'File-system based (src/routes/**/+page.svelte)',
          metaHandler: '<svelte:head> component'
        };
      }

      // Remix
      if (deps['@remix-run/react'] || deps['@remix-run/node']) {
        return {
          type: 'remix',
          name: 'Remix',
          version: deps['@remix-run/react'],
          templateEngine: 'React Components (TSX/JSX)',
          routingModel: 'File-system based (app/routes/**/*.tsx)',
          metaHandler: 'export const meta: MetaFunction'
        };
      }

      // Nuxt
      if (deps['nuxt'] || deps['nuxt3']) {
        return {
          type: 'nuxt',
          name: 'Nuxt.js',
          version: deps['nuxt'] || deps['nuxt3'],
          templateEngine: 'Vue SFC (Single File Components)',
          routingModel: 'File-system based (pages/**/*.vue)',
          metaHandler: 'useHead / useSeoMeta composables'
        };
      }

      // Docusaurus
      if (deps['@docusaurus/core']) {
        return {
          type: 'docusaurus',
          name: 'Docusaurus',
          version: deps['@docusaurus/core'],
          templateEngine: 'React + Markdown (.md, .mdx)',
          routingModel: 'File-system docs/pages',
          metaHandler: '<Head> component & frontmatter'
        };
      }

      // React SPA
      if (deps['react']) {
        return {
          type: 'react',
          name: 'React SPA',
          version: deps['react'],
          templateEngine: 'React JSX/TSX',
          routingModel: 'Client-side router (React Router, etc.)',
          metaHandler: 'react-helmet-async or index.html'
        };
      }

      // Vue SPA
      if (deps['vue']) {
        return {
          type: 'vue',
          name: 'Vue SPA',
          version: deps['vue'],
          templateEngine: 'Vue SFC',
          routingModel: 'Vue Router',
          metaHandler: '@vueuse/head or index.html'
        };
      }
    } catch {
      // Continue
    }
  }

  // Python (FastAPI, Django, Flask)
  if (
    fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
    fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectPath, 'manage.py'))
  ) {
    const isDjango = fs.existsSync(path.join(projectPath, 'manage.py'));
    return {
      type: 'python',
      name: isDjango ? 'Python (Django)' : 'Python (FastAPI / Flask)',
      templateEngine: isDjango ? 'Django Templates (.html / DTL)' : 'Jinja2 / API response',
      routingModel: isDjango ? 'urls.py' : 'FastAPI/Flask route decorators (@app.get)',
      metaHandler: 'Base HTML templates / Jinja2 blocks'
    };
  }

  // Go (Golang / Hugo / Gin)
  if (fs.existsSync(path.join(projectPath, 'go.mod')) || fs.existsSync(path.join(projectPath, 'hugo.toml')) || fs.existsSync(path.join(projectPath, 'config.toml'))) {
    const isHugo = fs.existsSync(path.join(projectPath, 'hugo.toml')) || fs.existsSync(path.join(projectPath, 'config.toml'));
    return {
      type: 'go',
      name: isHugo ? 'Hugo (Static Go Site)' : 'Go (Golang Web Backend)',
      templateEngine: 'Go html/template engine',
      routingModel: isHugo ? 'Content directory / Markdown files' : 'net/http / Gin routes',
      metaHandler: isHugo ? 'layouts/partials/head.html' : 'HTML template header'
    };
  }

  // Rust (Axum / Actix)
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    return {
      type: 'rust',
      name: 'Rust (Axum / Actix-web)',
      templateEngine: 'Askama / Tera / JSON-RPC',
      routingModel: 'Axum / Actix router',
      metaHandler: 'HTML templates / JSON endpoints'
    };
  }

  // Ruby on Rails
  if (fs.existsSync(path.join(projectPath, 'Gemfile')) && (fs.existsSync(path.join(projectPath, 'config/routes.rb')) || fs.existsSync(path.join(projectPath, 'app/views')))) {
    return {
      type: 'ruby-rails',
      name: 'Ruby on Rails',
      templateEngine: 'ERB (Embedded Ruby) / Slim / Haml',
      routingModel: 'config/routes.rb',
      metaHandler: 'app/views/layouts/application.html.erb'
    };
  }

  // Java / Spring Boot
  if (fs.existsSync(path.join(projectPath, 'pom.xml')) || (fs.existsSync(path.join(projectPath, 'build.gradle')) && fs.existsSync(path.join(projectPath, 'src/main/java')))) {
    return {
      type: 'java-spring',
      name: 'Java (Spring Boot)',
      templateEngine: 'Thymeleaf / JSP / REST API',
      routingModel: 'Spring @RequestMapping / @GetMapping',
      metaHandler: 'Thymeleaf layout dialect / header fragments'
    };
  }

  // C# / .NET
  const csprojFiles = scanFiles(['**/*.csproj'], { cwd: projectPath, ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**'] });
  if (csprojFiles.length > 0) {
    return {
      type: 'csharp-dotnet',
      name: 'ASP.NET Core (.NET)',
      templateEngine: 'Razor Pages (.cshtml) / Blazor',
      routingModel: 'ASP.NET Core Controllers & Minimal APIs',
      metaHandler: 'Views/Shared/_Layout.cshtml / <head>'
    };
  }

  // WordPress
  if (fs.existsSync(path.join(projectPath, 'wp-config.php')) || fs.existsSync(path.join(projectPath, 'wp-content'))) {
    return {
      type: 'wordpress',
      name: 'WordPress',
      templateEngine: 'PHP Theme Templates',
      routingModel: 'WordPress rewrite rules / Template hierarchy',
      metaHandler: 'wp_head() / Yoast / RankMath / functions.php'
    };
  }

  // Raw PHP
  const phpFiles = scanFiles(['**/*.php'], {
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/vendor/**']
  });
  if (phpFiles.length > 0) {
    return {
      type: 'php-raw',
      name: 'Raw PHP Website',
      templateEngine: 'PHP includes / native templates',
      routingModel: 'Direct file execution or .htaccess rewrites',
      metaHandler: 'header.php / direct <head> HTML'
    };
  }

  // Static HTML
  const htmlFiles = scanFiles(['**/*.html'], {
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**']
  });
  if (htmlFiles.length > 0) {
    return {
      type: 'html-static',
      name: 'Static HTML Website',
      templateEngine: 'Static HTML',
      routingModel: 'Direct static files',
      metaHandler: 'Direct <head> tags in HTML files'
    };
  }

  return {
    type: 'unknown',
    name: 'Unknown Web Project',
    templateEngine: 'Generic',
    routingModel: 'Generic'
  };
}


function detectRoutes(
  projectPath: string,
  framework: FrameworkType
): Array<{ path: string; filePath: string; pageType: PageType }> {
  const routes: Array<{ path: string; filePath: string; pageType: PageType }> = [];

  if (framework === 'laravel') {
    // Check Blade views
    const viewFiles = scanFiles(['resources/views/**/*.{blade.php,php}'], {
      cwd: projectPath
    });

    for (const view of viewFiles) {
      const rel = view.replace(/^resources\/views\//, '').replace(/\.(blade\.php|php)$/, '');
      if (rel.startsWith('layouts/') || rel.startsWith('components/') || rel.startsWith('partials/')) {
        continue;
      }
      let urlPath = '/' + rel.replace(/\/index$/, '').replace(/^index$/, '');
      if (urlPath === '') urlPath = '/';
      const pageType = classifyPageType(urlPath, view);
      routes.push({ path: urlPath, filePath: path.join(projectPath, view), pageType });
    }
  } else if (framework === 'nextjs-app') {
    const pageFiles = scanFiles(['{app,src/app}/**/page.{tsx,jsx,js}'], {
      cwd: projectPath
    });

    for (const file of pageFiles) {
      let routePath = file
        .replace(/^(app|src\/app)/, '')
        .replace(/\/page\.(tsx|jsx|js)$/, '')
        .replace(/\/\([^)]+\)/g, ''); // Remove route groups like (marketing)
      if (!routePath || routePath === '') routePath = '/';
      const pageType = classifyPageType(routePath, file);
      routes.push({ path: routePath, filePath: path.join(projectPath, file), pageType });
    }
  } else if (framework === 'nextjs-pages') {
    const pageFiles = scanFiles(['{pages,src/pages}/**/*.{tsx,jsx,js}'], {
      cwd: projectPath,
      ignore: ['**/_app.*', '**/_document.*', '**/api/**']
    });

    for (const file of pageFiles) {
      let routePath = file
        .replace(/^(pages|src\/pages)/, '')
        .replace(/\.(tsx|jsx|js)$/, '')
        .replace(/\/index$/, '');
      if (!routePath || routePath === '') routePath = '/';
      const pageType = classifyPageType(routePath, file);
      routes.push({ path: routePath, filePath: path.join(projectPath, file), pageType });
    }
  } else if (framework === 'astro') {
    const astroFiles = scanFiles(['{src/pages,pages}/**/*.{astro,md,mdx}'], {
      cwd: projectPath
    });
    for (const file of astroFiles) {
      let routePath = file
        .replace(/^(src\/pages|pages)/, '')
        .replace(/\.(astro|md|mdx)$/, '')
        .replace(/\/index$/, '');
      if (!routePath || routePath === '') routePath = '/';
      const pageType = classifyPageType(routePath, file);
      routes.push({ path: routePath, filePath: path.join(projectPath, file), pageType });
    }
  } else if (framework === 'sveltekit') {
    const svelteFiles = scanFiles(['src/routes/**/+page.svelte'], {
      cwd: projectPath
    });
    for (const file of svelteFiles) {
      let routePath = file
        .replace(/^src\/routes/, '')
        .replace(/\/+page\.svelte$/, '');
      if (!routePath || routePath === '') routePath = '/';
      const pageType = classifyPageType(routePath, file);
      routes.push({ path: routePath, filePath: path.join(projectPath, file), pageType });
    }
  } else {
    // Generic HTML / PHP
    const files = scanFiles(['**/*.{html,php}'], {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/includes/**']
    });

    for (const file of files) {
      let routePath = '/' + file.replace(/\.(html|php)$/, '').replace(/\/index$/, '').replace(/^index$/, '');
      if (routePath === '') routePath = '/';
      const pageType = classifyPageType(routePath, file);
      routes.push({ path: routePath, filePath: path.join(projectPath, file), pageType });
    }
  }

  return routes;
}

export function classifyPageType(urlPath: string, filePath: string): PageType {
  const lower = (urlPath + ' ' + filePath).toLowerCase();

  if (urlPath === '/' || urlPath === '' || lower.includes('home') || lower.includes('index')) {
    if (urlPath === '/' || urlPath === '') return 'homepage';
  }

  if (lower.includes('service') || lower.includes('services') || lower.includes('solution')) return 'service';
  if (lower.includes('product') || lower.includes('products') || lower.includes('shop') || lower.includes('item')) return 'product';
  if (lower.includes('category') || lower.includes('categories') || lower.includes('collection')) return 'category';
  if (lower.includes('city') || lower.includes('location') || lower.includes('locations') || lower.includes('area') || lower.includes('neighborhood')) {
    if (lower.includes('city')) return 'city';
    if (lower.includes('area') || lower.includes('neighborhood')) return 'area';
    if (lower.includes('state')) return 'state';
    return 'location';
  }
  if (lower.includes('blog') || lower.includes('news') || lower.includes('post') || lower.includes('articles')) {
    if (lower.includes('article') || lower.includes('/blog/') || lower.includes('/posts/')) return 'article';
    return 'blog';
  }
  if (lower.includes('landing') || lower.includes('campaign') || lower.includes('promo')) return 'landing';
  if (lower.includes('pricing') || lower.includes('plans') || lower.includes('cost')) return 'pricing';
  if (lower.includes('vs') || lower.includes('compare') || lower.includes('comparison') || lower.includes('alternative')) return 'comparison';
  if (lower.includes('faq') || lower.includes('questions') || lower.includes('help')) return 'faq';
  if (lower.includes('contact') || lower.includes('reach-us') || lower.includes('get-in-touch')) return 'contact';
  if (lower.includes('about') || lower.includes('our-story') || lower.includes('team') || lower.includes('who-we-are')) return 'about';
  if (lower.includes('author') || lower.includes('profile')) return 'author';
  if (lower.includes('tag') || lower.includes('topic')) return 'tag';
  if (lower.includes('search')) return 'search';
  if (lower.includes('page/') || lower.includes('p=')) return 'pagination';
  if (lower.includes('[') || lower.includes(':')) return 'dynamic';
  if (lower.includes('/api/')) return 'api';

  return 'unknown';
}
