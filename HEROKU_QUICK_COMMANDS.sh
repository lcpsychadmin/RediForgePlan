#!/bin/bash
# REDIFORGE HEROKU DEPLOYMENT - QUICK COMMAND REFERENCE
# Run these commands in order to deploy to Heroku

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         RediForge Heroku Deployment - Quick Reference         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# PHASE 1: GIT SETUP
# ============================================================
echo -e "${YELLOW}PHASE 1: GIT SETUP${NC}"
echo "1.1 Check git status:"
echo "    cd /Users/wescollins/Documents/RediForge\ -\ Plan/app"
echo "    git status"
echo ""
echo "1.2 Add all files:"
echo "    git add ."
echo ""
echo "1.3 Commit:"
echo "    git commit -m 'Initial RediForge deployment to Heroku'"
echo ""

# ============================================================
# PHASE 2: HEROKU SETUP
# ============================================================
echo -e "${YELLOW}PHASE 2: HEROKU SETUP${NC}"
echo "2.1 Login to Heroku:"
echo "    heroku login"
echo ""
echo "2.2 Create app (REGION: us):"
echo "    heroku create rediforge-plan --region us"
echo ""
echo "2.3 Verify remote:"
echo "    git remote -v"
echo ""

# ============================================================
# PHASE 3: DATABASE
# ============================================================
echo -e "${YELLOW}PHASE 3: DATABASE${NC}"
echo "3.1 Add PostgreSQL:"
echo "    heroku addons:create heroku-postgresql:standard-0 --app rediforge-plan"
echo ""
echo "3.2 Get database URL:"
echo "    heroku config:get DATABASE_URL --app rediforge-plan"
echo ""
echo "3.3 Verify database:"
echo "    heroku pg:info --app rediforge-plan"
echo ""

# ============================================================
# PHASE 4: ENVIRONMENT VARIABLES
# ============================================================
echo -e "${YELLOW}PHASE 4: ENVIRONMENT VARIABLES${NC}"
echo "4.1 Generate secrets:"
echo "    # JWT_SECRET"
echo "    node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "    # MFA_ENCRYPTION_KEY"
echo "    node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "    # ENCRYPTION_IV"
echo "    node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\""
echo ""
echo "4.2 Set environment variables:"
echo "    heroku config:set NODE_ENV=production --app rediforge-plan"
echo "    heroku config:set JWT_SECRET=\"<YOUR_JWT_SECRET>\" --app rediforge-plan"
echo "    heroku config:set MFA_ENCRYPTION_KEY=\"<YOUR_MFA_KEY>\" --app rediforge-plan"
echo "    heroku config:set ENCRYPTION_IV=\"<YOUR_IV>\" --app rediforge-plan"
echo "    heroku config:set API_BASE_URL=\"https://rediforge-plan.herokuapp.com/api\" --app rediforge-plan"
echo "    heroku config:set FRONTEND_URL=\"https://rediforge-plan.herokuapp.com\" --app rediforge-plan"
echo ""
echo "4.3 Verify all vars:"
echo "    heroku config --app rediforge-plan"
echo ""

# ============================================================
# PHASE 5: BUILD VERIFICATION
# ============================================================
echo -e "${YELLOW}PHASE 5: BUILD VERIFICATION${NC}"
echo "5.1 Build locally:"
echo "    rm -rf client/dist server/dist"
echo "    npm run build"
echo ""
echo "5.2 Verify builds exist:"
echo "    ls -la client/dist/"
echo "    ls -la server/dist/"
echo ""

# ============================================================
# PHASE 6: DEPLOYMENT
# ============================================================
echo -e "${YELLOW}PHASE 6: DEPLOYMENT${NC}"
echo "6.1 Deploy to Heroku:"
echo "    git push heroku main"
echo "    # Or: git push heroku master"
echo ""
echo "6.2 Monitor logs (real-time):"
echo "    heroku logs --tail --app rediforge-plan"
echo ""
echo "6.3 Verify app is running:"
echo "    heroku ps --app rediforge-plan"
echo ""
echo "6.4 Test deployment:"
echo "    curl -I https://rediforge-plan.herokuapp.com/"
echo "    # Expected: HTTP/2 200"
echo ""

# ============================================================
# PHASE 7: DATABASE MIGRATION
# ============================================================
echo -e "${YELLOW}PHASE 7: DATABASE MIGRATION${NC}"
echo "7.1 Run migrations (if needed):"
echo "    heroku run npm run db:migrate --app rediforge-plan"
echo ""
echo "7.2 Seed database (optional):"
echo "    heroku run npm run db:seed --app rediforge-plan"
echo ""

# ============================================================
# PHASE 8: CUSTOM DOMAIN
# ============================================================
echo -e "${YELLOW}PHASE 8: CUSTOM DOMAIN${NC}"
echo "8.1 Add custom domain:"
echo "    heroku domains:add plan.rediforge.com --app rediforge-plan"
echo ""
echo "8.2 Get DNS target:"
echo "    heroku domains --app rediforge-plan"
echo ""

# ============================================================
# PHASE 9: DNS CONFIGURATION
# ============================================================
echo -e "${YELLOW}PHASE 9: DNS CONFIGURATION (Via DNS Provider)${NC}"
echo "Add CNAME record:"
echo "    Type: CNAME"
echo "    Host: plan"
echo "    Value: rediforge-plan.herokuapp.com"
echo "    TTL: 300 (or 3600)"
echo ""
echo "For root domain, use ALIAS or ANAME (depends on provider)"
echo ""
echo "9.1 Verify DNS propagation:"
echo "    nslookup plan.rediforge.com"
echo "    dig plan.rediforge.com"
echo ""

# ============================================================
# PHASE 10: SSL CERTIFICATE
# ============================================================
echo -e "${YELLOW}PHASE 10: SSL CERTIFICATE${NC}"
echo "10.1 Enable Automatic Certificate Management:"
echo "     heroku certs:auto:enable --app rediforge-plan"
echo ""
echo "10.2 Check certificate status:"
echo "     heroku certs --app rediforge-plan"
echo ""
echo "10.3 Test HTTPS:"
echo "     curl -I https://rediforge-plan.herokuapp.com/"
echo "     curl -I https://plan.rediforge.com/"
echo "     # Expected: HTTP/2 200"
echo ""

# ============================================================
# PHASE 11: FINAL VERIFICATION
# ============================================================
echo -e "${YELLOW}PHASE 11: FINAL VERIFICATION${NC}"
echo "11.1 Test Heroku domain:"
echo "     open https://rediforge-plan.herokuapp.com/"
echo ""
echo "11.2 Test custom domain (after DNS propagates):"
echo "     open https://plan.rediforge.com/"
echo ""
echo "11.3 View logs:"
echo "     heroku logs --tail --app rediforge-plan"
echo ""
echo "11.4 Check dyno status:"
echo "     heroku ps --app rediforge-plan"
echo ""

# ============================================================
# USEFUL COMMANDS
# ============================================================
echo -e "${YELLOW}USEFUL COMMANDS${NC}"
echo "View logs (real-time):          heroku logs --tail --app rediforge-plan"
echo "View config vars:                heroku config --app rediforge-plan"
echo "Set env var:                     heroku config:set KEY=VALUE --app rediforge-plan"
echo "Run command:                     heroku run 'COMMAND' --app rediforge-plan"
echo "Restart app:                     heroku restart --app rediforge-plan"
echo "View database info:              heroku pg:info --app rediforge-plan"
echo "Open app in browser:             heroku open --app rediforge-plan"
echo ""

echo -e "${GREEN}✅ Follow the phases above in order for a successful deployment!${NC}"
