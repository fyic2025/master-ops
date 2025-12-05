# Claude Code Plugin Setup

> **Note:** Official Anthropic skills have been manually installed to `.claude/skills/`.
> The `/plugin` command is not available in the VS Code extension.
> See [SKILLS-REGISTRY.md](SKILLS-REGISTRY.md) for the complete list of 54 available skills.

## Manual Installation (Completed)

The following skills were installed on 2025-12-05:
- frontend-design, canvas-design, brand-guidelines, theme-factory
- web-artifacts-builder, algorithmic-art, mcp-builder, skill-creator
- pdf, xlsx, docx, pptx
- webapp-testing, doc-coauthoring, internal-comms, slack-gif-creator

---

## Plugin Commands (For Future Reference)

Run these commands in Claude Code to install useful plugins.

## Step 1: Add Marketplaces

Paste each command separately:

```
/plugin marketplace add anthropics/skills
```

```
/plugin marketplace add anthropics/claude-code
```

```
/plugin marketplace add jeremylongshore/claude-code-plugins-plus
```

```
/plugin marketplace add qdhenry/Claude-Command-Suite
```

```
/plugin marketplace add Koomook/claude-frontend-skills
```

## Step 2: Install Official Document Skills

These are essential for working with documents:

```
/plugin install document-skills@anthropics/skills
```

This includes:
- **xlsx** - Excel file processing
- **docx** - Word document processing
- **pptx** - PowerPoint processing
- **pdf** - PDF handling

## Step 3: Install Design Skills (Recommended)

### Official Frontend Design Plugin
```
/plugin install frontend-design@anthropics/claude-code
```

Creates distinctive, production-grade frontend interfaces:
- **Typography**: Distinctive fonts, bold pairings (not generic Inter/Arial)
- **Color**: Cohesive schemes with dominant colors + sharp accents
- **Motion**: Orchestrated page-load animations, scroll-triggered effects
- **Spatial**: Asymmetry, overlap, grid-breaking, intentional negative space

### Community Frontend Skills
```
npm install -g @bong/claude-frontend-skills
```

Or manually install from [Koomook/claude-frontend-skills](https://github.com/Koomook/claude-frontend-skills):
- **distinctive-frontend**: Cyberpunk, Brutalist, Vaporwave, Nordic aesthetics
- Extreme font weight contrasts (100-200 vs 800-900)
- Layered gradients, textures, atmospheric depth

### Canvas Design (Visual Art)
```
/plugin install example-skills@anthropics/skills
```

Includes:
- **canvas-design**: Museum-quality visual art in PNG/PDF
- **brand-guidelines**: Brand identity systems
- **theme-factory**: Theme styling
- **frontend-design**: Web component design
- **web-artifacts-builder**: Multi-component HTML artifacts (React, Tailwind, shadcn/ui)

### Figma Integration (MCP Server)

Add Figma MCP for pixel-perfect design-to-code:
```
claude mcp add-json "f2c-mcp" '{"command":"npx","args":["-y","@f2c/mcp"]}'
```

Or install the official Figma MCP:
```
claude mcp add figma
```

Capabilities:
- Extract design tokens (colors, spacing, typography)
- Generate React + Tailwind from Figma selections
- Maintain design system consistency

## Step 4: Install Community Plugins

### Development Workflow
```
/plugin install ai-commit-gen@jeremylongshore/claude-code-plugins-plus
```

### Database Management
```
/plugin install database-migration-manager@jeremylongshore/claude-code-plugins-plus
```

```
/plugin install query-performance-analyzer@jeremylongshore/claude-code-plugins-plus
```

### Automation
```
/plugin install n8n-workflow-designer@jeremylongshore/claude-code-plugins-plus
```

```
/plugin install make-scenario-builder@jeremylongshore/claude-code-plugins-plus
```

### Analytics & Data
```
/plugin install data-visualization-creator@jeremylongshore/claude-code-plugins-plus
```

```
/plugin install excel-analyst-pro@jeremylongshore/claude-code-plugins-plus
```

### Design & UI
```
/plugin install design-to-code@jeremylongshore/claude-code-plugins-plus
```

Converts Figma designs/screenshots → React/Svelte/Vue with accessibility built-in.

### Testing & Quality
```
/plugin install accessibility-test-scanner@jeremylongshore/claude-code-plugins-plus
```

```
/plugin install performance-test-suite@jeremylongshore/claude-code-plugins-plus
```

## Step 5: Verify Installation

```
/plugin
```

This opens the interactive plugin browser to verify what's installed.

```
/help
```

Lists all available commands including those from plugins.

## Useful Plugin Commands

| Command | Description |
|---------|-------------|
| `/plugin` | Browse available plugins |
| `/plugin marketplace list` | List configured marketplaces |
| `/plugin marketplace update` | Refresh marketplace metadata |
| `/plugin enable name@marketplace` | Enable a plugin |
| `/plugin disable name@marketplace` | Disable a plugin |
| `/plugin uninstall name@marketplace` | Remove a plugin |

## Recommended Plugins for Your Business

Based on your 4 e-commerce stores (BOO, Teelixir, Elevate, RHF):

### Design & Frontend
| Plugin | Why Useful |
|--------|------------|
| `frontend-design` | Distinctive landing pages, product pages, dashboards |
| `design-to-code` | Convert mockups to React/Tailwind components |
| `canvas-design` | Marketing visuals, social media graphics |
| `brand-guidelines` | Maintain consistent brand identity across stores |
| `web-artifacts-builder` | Email templates, marketing pages with shadcn/ui |

### Operations & Data
| Plugin | Why Useful |
|--------|------------|
| `document-skills` | Handle supplier Excel files, create PDF reports |
| `n8n-workflow-designer` | Design workflows for your n8n automations |
| `database-migration-manager` | Manage Supabase schema changes |
| `query-performance-analyzer` | Optimize Supabase queries |
| `excel-analyst-pro` | Financial analysis, inventory reports |
| `data-visualization-creator` | Dashboard charts and graphs |

## Quick Install - Design Focus

Copy/paste this block to install all design skills:

```
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@anthropics/claude-code
/plugin install example-skills@anthropics/skills
/plugin install design-to-code@jeremylongshore/claude-code-plugins-plus
```

## After Installation

Restart Claude Code for changes to take effect.
