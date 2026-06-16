# DNS Configuration Guide for plan.rediforge.com

## Overview

After adding your custom domain to Heroku, you need to configure DNS records at your DNS provider to point the domain to your Heroku app.

**DNS Target**: `rediforge-plan.herokuapp.com`

---

## Getting DNS Target from Heroku

```bash
heroku domains --app rediforge-plan
```

**Output:**
```
Domain Name              Status     SSL Cert Status
────────────────────────────────────────────────────
plan.rediforge.com       pending    Pending Certificate
rediforge-plan.herokuapp.com  ok    Cert issued
```

The DNS target for your CNAME record is: **`rediforge-plan.herokuapp.com`**

---

## DNS Record Configuration

### CNAME Record (Recommended for Subdomains)

For `plan.rediforge.com`:

```
Type:    CNAME
Host:    plan
Name:    plan.rediforge.com
Target:  rediforge-plan.herokuapp.com
TTL:     300 (5 minutes) to 3600 (1 hour)
```

---

## Provider-Specific Instructions

### 1. GoDaddy

**Step 1: Navigate to DNS Settings**
- Login to GoDaddy.com
- Go to: My Products → Domains
- Select `rediforge.com`
- Click: "DNS"

**Step 2: Add DNS Record**
- Under "Records"
- Click: "Add" button
- Type: CNAME
- Host: `plan`
- Points to: `rediforge-plan.herokuapp.com`
- TTL: 600 (or 3600)
- Click: "Save"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
# or
dig plan.rediforge.com
```

---

### 2. Namecheap

**Step 1: Navigate to DNS Settings**
- Login to Namecheap.com
- Go to: Domain List
- Click domain: `rediforge.com`
- Tab: "Advanced DNS"

**Step 2: Add DNS Record**
- Click: "Add New Record"
- Type: CNAME Record
- Host: `plan`
- Value: `rediforge-plan.herokuapp.com.` (note the trailing dot)
- TTL: 300
- Click: "Save"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 3. AWS Route 53

**Step 1: Navigate to Hosted Zone**
- Login to AWS Management Console
- Go to: Route 53 → Hosted zones
- Select: `rediforge.com`

**Step 2: Add Record**
- Click: "Create record"
- Quick create record dialog:
  - Record name: `plan`
  - Record type: CNAME
  - Value: `rediforge-plan.herokuapp.com.` (note trailing dot)
  - TTL: 300
  - Click: "Create records"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 4. Cloudflare

**Step 1: Navigate to DNS**
- Login to Cloudflare
- Go to: Websites → rediforge.com
- Tab: "DNS" (or "Records")

**Step 2: Add DNS Record**
- Click: "Add record"
- Type: CNAME
- Name: `plan`
- Target: `rediforge-plan.herokuapp.com`
- TTL: Auto (or 300)
- Proxy status: DNS only (or Proxied for Cloudflare features)
- Click: "Save"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 5. Bluehost

**Step 1: Navigate to DNS Zone Editor**
- Login to Bluehost
- Go to: Hosting → Domains
- Select: `rediforge.com`
- Click: "DNS Zone Editor"

**Step 2: Add DNS Record**
- Under "CNAME Records"
- Click: "Add CNAME Record"
- Name: `plan`
- Points to: `rediforge-plan.herokuapp.com`
- Click: "Add Record"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 6. HostGator

**Step 1: Navigate to DNS Management**
- Login to HostGator
- Go to: My Accounts → Manage Account
- In Hosting area: "Manage DNS"

**Step 2: Add DNS Record**
- Click: "Add Record"
- Type: CNAME
- Name: `plan`
- Address: `rediforge-plan.herokuapp.com`
- TTL: 600
- Click: "Save Record"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 7. DreamHost

**Step 1: Navigate to DNS**
- Login to DreamHost
- Go to: Manage Domains
- Select: `rediforge.com`
- Tab: "DNS" or "DNS Settings"

**Step 2: Add DNS Record**
- Under CNAME Records section
- Host: `plan`
- Value: `rediforge-plan.herokuapp.com`
- TTL: 3600
- Click: "Add"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 8. Google Domains

**Step 1: Navigate to DNS**
- Login to Google Domains
- Go to: Registered domains
- Select: `rediforge.com`
- Tab: "DNS"

**Step 2: Add DNS Record**
- Under "Custom records"
- Click: "Add"
- Name: `plan`
- Type: CNAME
- TTL: 300
- Data: `rediforge-plan.herokuapp.com`
- Click: "Save"

**Step 3: Verify**
```bash
nslookup plan.rediforge.com
```

---

### 9. Other Providers

If your provider is not listed above:

1. Login to your DNS provider
2. Find "DNS Zone Editor" or "DNS Settings" or "Advanced DNS"
3. Add a new CNAME record with:
   - **Type**: CNAME
   - **Host/Name**: `plan`
   - **Target/Value**: `rediforge-plan.herokuapp.com.` (some require trailing dot)
   - **TTL**: 300-3600 (or auto)
4. Save the record

---

## DNS Propagation Verification

### Quick Check
```bash
# Should return: rediforge-plan.herokuapp.com
nslookup plan.rediforge.com
```

### Detailed Check
```bash
# Show DNS records
dig plan.rediforge.com
dig plan.rediforge.com +short
dig plan.rediforge.com MX
dig plan.rediforge.com NS
```

### Global Propagation Check
- Use online tools: https://www.whatsmydns.net/
- Enter: `plan.rediforge.com`
- Type: CNAME
- Shows propagation status worldwide

---

## Timeline

- **Immediately**: DNS record created at provider
- **5-30 minutes**: Most DNS servers updated (typical)
- **1-2 hours**: Most regions updated
- **Up to 48 hours**: Worst case (usually much faster)

---

## Troubleshooting

### DNS Not Resolving

**Problem**: `nslookup plan.rediforge.com` returns error

**Solutions:**
1. Verify CNAME record created correctly
2. Check for typos in target (`rediforge-plan.herokuapp.com`)
3. Wait for propagation (5-30 minutes typical)
4. Try different DNS servers:
   ```bash
   # Use Google DNS
   nslookup plan.rediforge.com 8.8.8.8
   ```

### Domain Shows as "Pending" in Heroku

**Problem**: `heroku domains --app rediforge-plan` shows status as "pending"

**Solution:**
1. Verify DNS record created
2. Wait for DNS propagation (15-30 minutes)
3. Heroku will automatically update status once DNS resolves
4. If still pending after 1 hour:
   ```bash
   heroku domains:remove plan.rediforge.com --app rediforge-plan
   heroku domains:add plan.rediforge.com --app rediforge-plan
   ```

### SSL Certificate Not Issued

**Problem**: Certificate status shows "Pending Certificate"

**Solution:**
1. Ensure DNS resolves correctly first
2. Wait for DNS propagation
3. Heroku will automatically provision certificate once DNS is working
4. Monitor status:
   ```bash
   heroku certs --app rediforge-plan
   ```

### Multiple CNAME Records

**Problem**: Multiple CNAME records created accidentally

**Solution:**
1. Keep only ONE CNAME record for `plan`
2. Delete duplicates
3. Verify only one record exists

---

## After DNS is Working

### Verify HTTPS Works

```bash
# Should return HTTP/2 200
curl -I https://plan.rediforge.com/

# Should show valid certificate
openssl s_client -connect plan.rediforge.com:443
```

### Monitor Heroku Status

```bash
# Should show domain as "ok" with valid certificate
heroku domains --app rediforge-plan
```

### Test in Browser

Open: https://plan.rediforge.com/
- [ ] App loads
- [ ] No SSL warnings
- [ ] URL shows https://plan.rediforge.com/

---

## Common CNAME Issues & Solutions

### Issue: "CNAME at apex"

**Problem**: Trying to create CNAME for root domain (`rediforge.com`) instead of subdomain

**Solution**: Use ALIAS or ANAME record (if supported) or use subdomain (`plan.rediforge.com`)

```
❌ Wrong:
Type: CNAME
Host: @  (root)

✅ Correct:
Type: CNAME
Host: plan  (subdomain)
```

### Issue: Pointing to Wrong Target

**Problem**: CNAME points to `rediforge-plan.herokuapp.com.` instead of `rediforge-plan.herokuapp.com`

**Solution**: Ensure target is exact. Some providers require trailing dot, others don't - check your provider's format.

### Issue: DNS Not Updating

**Problem**: DNS changes not reflecting after 1 hour

**Solution**:
1. Clear DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemctl restart nscd
   
   # Windows
   ipconfig /flushdns
   ```

2. Try different DNS server:
   ```bash
   nslookup plan.rediforge.com 8.8.8.8
   ```

---

## Double-Check Checklist

Before considering DNS setup complete:

- [ ] CNAME record created at DNS provider
- [ ] Type: CNAME
- [ ] Host/Name: `plan`
- [ ] Target/Value: `rediforge-plan.herokuapp.com`
- [ ] TTL: 300-3600 (or auto)
- [ ] Only ONE CNAME record for `plan`
- [ ] `nslookup plan.rediforge.com` returns CNAME
- [ ] `heroku domains --app rediforge-plan` shows domain as "ok"
- [ ] SSL certificate shows as "issued"
- [ ] `https://plan.rediforge.com/` loads in browser
- [ ] No SSL warnings in browser

---

## Next Steps

Once DNS is working:

1. Verify SSL certificate:
   ```bash
   heroku certs --app rediforge-plan
   ```

2. Test HTTPS:
   ```bash
   curl -I https://plan.rediforge.com/
   ```

3. Monitor application:
   ```bash
   heroku logs --tail --app rediforge-plan
   ```

---

**Reference**: DNS CNAME configuration for plan.rediforge.com → rediforge-plan.herokuapp.com
