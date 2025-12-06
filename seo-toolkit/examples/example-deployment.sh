#!/bin/bash
#
# Example Deployment Workflow
# Demonstrates complete deployment process with validation gates
#

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Example Deployment Workflow                                ║"
echo "║   Full validation → Staging → Approval → Production         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BRAND="teelixir"
STORE="teelixir-au.myshopify.com"
THEME_PATH="/root/master-ops/teelixir"

echo "Configuration:"
echo "  Brand: $BRAND"
echo "  Store: $STORE"
echo "  Theme Path: $THEME_PATH"
echo ""

# Phase 1: Pre-Deployment Audit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 1: Pre-Deployment Lighthouse Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")/.."

echo "Running Lighthouse audit on key pages..."
echo ""

npm run lighthouse:multi -- --brand=$BRAND --env=production

echo ""
read -p "Continue with deployment? (y/n): " CONTINUE

if [ "$CONTINUE" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Phase 2: Deploy to Staging
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 2: Deploy to Staging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "This will deploy your current theme to staging (unpublished theme)..."
echo ""

npm run deploy -- \
  --brand=$BRAND \
  --env=staging \
  --store=$STORE \
  --path=$THEME_PATH \
  --skip-approval

STAGING_EXIT_CODE=$?

if [ $STAGING_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Staging deployment failed. Deployment cancelled."
    exit 1
fi

echo ""
echo "✅ Staging deployment successful!"
echo ""

# Phase 3: Staging Validation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 3: Staging Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Manual validation checklist:"
echo "  1. Visit staging URL in browser"
echo "  2. Test add to cart functionality"
echo "  3. Test checkout flow"
echo "  4. Verify no visual regressions"
echo "  5. Check mobile responsiveness"
echo ""
read -p "Staging validation passed? (y/n): " STAGING_VALIDATION

if [ "$STAGING_VALIDATION" != "y" ]; then
    echo "Staging validation failed. Please fix issues before deploying to production."
    exit 1
fi

# Phase 4: Production Deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 4: Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⚠️  WARNING: This will deploy to PRODUCTION (live site)"
echo ""
echo "Pre-deployment checklist:"
echo "  ✓ All validation gates passed"
echo "  ✓ Staging deployment successful"
echo "  ✓ Staging validation complete"
echo "  ✓ Team notified"
echo ""
read -p "Deploy to PRODUCTION? (yes/no): " PRODUCTION_CONFIRM

if [ "$PRODUCTION_CONFIRM" != "yes" ]; then
    echo "Production deployment cancelled."
    exit 0
fi

echo ""
echo "Deploying to production..."
echo ""

npm run deploy -- \
  --brand=$BRAND \
  --env=production \
  --store=$STORE \
  --path=$THEME_PATH

PRODUCTION_EXIT_CODE=$?

if [ $PRODUCTION_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Production deployment failed."
    exit 1
fi

# Phase 5: Post-Deployment Monitoring
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 5: Post-Deployment Monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Production deployment complete!"
echo "Monitoring for 5 minutes..."
echo ""

# Wait and check scores
sleep 30

echo "Running post-deployment Lighthouse audit..."
npm run lighthouse:audit -- \
  --url="https://$STORE/" \
  --brand=$BRAND \
  --env=production \
  --device=desktop \
  --type=homepage

POST_DEPLOY_EXIT_CODE=$?

echo ""

if [ $POST_DEPLOY_EXIT_CODE -eq 0 ]; then
    echo "✅ Post-deployment validation PASSED"
    echo ""
    echo "Deployment successful! 🎉"
    echo ""
    echo "Next steps:"
    echo "  • Monitor for 24 hours: npm run monitor:alerts"
    echo "  • Check latest scores: npm run monitor:scores -- --brand=$BRAND"
    echo "  • Review deployment: npm run deploy:list"
else
    echo "⚠️  Post-deployment scores below threshold"
    echo ""
    echo "Consider rollback if issues persist:"
    echo "  npm run deploy:rollback -- --deployment-id=<DEPLOYMENT_ID>"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment workflow complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
