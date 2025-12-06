# AWS Infrastructure Discovery - Buy Organics Online

**Date:** November 21, 2025
**Status:** In Progress - Phase 1 Discovery
**AWS Account:** 263579591435 (E-Tailer World Pty Ltd)

---

## Executive Summary

Initial AWS infrastructure audit has been completed. Two MySQL databases and five EC2 instances identified. Currently awaiting database access to identify Buy Organics Online product data and sync logic.

---

## AWS Resources Discovered

### RDS MySQL Databases

#### 1. newsync5
- **Instance ID:** newsync5
- **Endpoint:** newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com:3306
- **Engine:** MySQL 8.0.42
- **Instance Class:** db.t3.small (2 vCPU, 2 GB RAM)
- **Storage:** 20 GB gp2
- **Created:** June 20, 2022
- **Multi-AZ:** No
- **Public Access:** No (private only)
- **Backup Retention:** 7 days
- **Backup Window:** 19:25-19:55 UTC
- **Maintenance Window:** Friday 12:32-13:02 UTC
- **Master User:** admin
- **Security Groups:** sg-038669bc8f9ae531b, sg-bc17bdd9
- **VPC:** vpc-e976b08c
- **Availability Zone:** ap-southeast-2b
- **Cost Estimate:** ~$30-40/month

**Notes:**
- Older database (2.5+ years old)
- Not publicly accessible (requires VPN or bastion host)
- Single AZ deployment

#### 2. newsync6
- **Instance ID:** newsync6
- **Endpoint:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com:3306
- **Engine:** MySQL 8.0.42
- **Instance Class:** db.t3.small (2 vCPU, 2 GB RAM)
- **Storage:** 20 GB gp2
- **Created:** February 3, 2025
- **Multi-AZ:** Yes (Primary: ap-southeast-2b, Secondary: ap-southeast-2c)
- **Public Access:** Yes (can connect from internet)
- **Backup Retention:** 7 days
- **Backup Window:** 19:25-19:55 UTC
- **Maintenance Window:** Friday 12:32-13:02 UTC
- **Master User:** admin
- **Security Groups:** sg-bc17bdd9
- **VPC:** vpc-e976b08c
- **Cost Estimate:** ~$60-80/month (Multi-AZ doubles cost)

**Notes:**
- Newer database (created Feb 2025)
- Publicly accessible - easier to connect for migration
- Multi-AZ for high availability
- **LIKELY CANDIDATE for BOO data** (newer, production-grade setup)

---

### EC2 Instances

#### Running Instances

##### 1. Hosting 3.1 - [fyic.com.au]
- **Instance ID:** i-04dc435af0436943e
- **Type:** t2.medium (2 vCPU, 4 GB RAM)
- **State:** Running
- **Public IP:** 13.55.46.130
- **Private IP:** 172.31.11.170
- **DNS:** ec2-13-55-46-130.ap-southeast-2.compute.amazonaws.com
- **Key Pair:** Fyic_Hosting
- **Security Group:** sg-bc17bdd9 (default)
- **Launch Time:** November 4, 2025, 07:38:40 UTC
- **AMI:** ami-99f3f4fa (old image from 2017)
- **VPC:** vpc-e976b08c
- **Subnet:** subnet-7be23e1e (ap-southeast-2a)
- **Storage:** /dev/sda1 (vol-0ed28654e38a97c19)
- **Cost Estimate:** ~$35-40/month

**Purpose:**
- Likely hosting fyic.com.au website
- May have cron jobs for BOO product sync
- **ACTION REQUIRED:** Need SSH access to check cron jobs

##### 2. findyouridealcustomersNew
- **Instance ID:** i-0f9a5e987915169c7
- **Type:** t2.small (1 vCPU, 2 GB RAM)
- **State:** Running
- **Public IP:** 13.55.157.71
- **Private IP:** 172.31.9.129
- **DNS:** ec2-13-55-157-71.ap-southeast-2.compute.amazonaws.com
- **Key Pair:** findyouridealcustomersNew
- **Security Group:** sg-0c5a4c16f1128f3f8 (launch-wizard-2)
- **Launch Time:** November 4, 2025, 07:20:23 UTC
- **AMI:** ami-0ec19a300f3097b5a (2023 image)
- **VPC:** vpc-e976b08c
- **Subnet:** subnet-7be23e1e (ap-southeast-2a)
- **Storage:** /dev/sda1 (vol-0ec70d918fcda4137)
- **Cost Estimate:** ~$18-20/month

**Purpose:**
- Running findyouridealcustomers.com.au
- Created March 2023
- **ACTION REQUIRED:** Need SSH access to check cron jobs

#### Stopped Instances (Not Costing Money)

3. **WHM_cPanel--[stopped]** (i-00d536d72b89b2fa8) - t2.small
4. **WHM_DNS_Only-[stopped]** (i-0cc01599f75873782) - t2.micro
5. **findyouridealcustomers.com.au** (i-0058abc9141d2e0d5) - t2.micro (old version)

---

### S3 Buckets

#### 1. aws-cloudtrail-logs-263579591435-c1b41a23
- **Created:** November 12, 2024
- **Purpose:** AWS CloudTrail logs (audit trail)
- **Region:** ap-southeast-2

#### 2. fyic-log
- **Created:** November 13, 2024
- **Purpose:** Unknown - possibly application logs
- **Region:** ap-southeast-2

**Notes:**
- No S3 buckets found for CSV storage or product images
- CSVs likely stored locally or on EC2 instances
- Product images likely hosted on BigCommerce or elsewhere

---

### Lambda Functions

**Result:** No Lambda functions found

**Implication:** All automation is running via cron jobs on EC2 or locally on developer's machine

---

### EventBridge / CloudWatch Events

**Result:** No scheduled rules found

**Implication:** Confirms no serverless automation - all sync jobs are traditional cron jobs

---

## Architecture Summary

### Current Infrastructure Pattern

```
┌─────────────────────────────────────────────────────────┐
│                  Developer's Local Machine              │
│                  (Cron jobs running?)                   │
│                         OR                              │
│                  EC2 Instances                          │
│              (Cron jobs via crontab)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├──> Supplier APIs (fetch data)
                     ├──> Supplier CSVs (download/parse)
                     │
                     ▼
           ┌─────────────────────┐
           │   MySQL Database    │
           │  (newsync5/6)       │
           │  Product staging    │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  BigCommerce API    │
           │  Update products    │
           └─────────────────────┘
```

### Key Findings

1. **No Serverless Infrastructure**
   - No Lambda functions
   - No EventBridge rules
   - No API Gateway
   - Traditional server-based architecture

2. **Cron Job Location Unknown**
   - Could be on EC2 instances
   - Could be on developer's local machine
   - **Need SSH access to EC2 to check**

3. **Database Access Required**
   - Two MySQL databases: newsync5 and newsync6
   - Need password to explore schema
   - Need to identify which has BOO data

4. **No CSV Storage Infrastructure**
   - No S3 buckets for CSV files
   - CSVs likely downloaded directly and processed
   - No centralized file storage

---

## Cost Analysis

### Current Monthly AWS Costs

**From Console:** $177.71/month current, $253.13/month forecasted

**Breakdown (Estimated):**
- RDS newsync5 (single AZ): ~$35/month
- RDS newsync6 (Multi-AZ): ~$70/month
- EC2 Hosting 3.1 (t2.medium): ~$35/month
- EC2 findyouridealcustomersNew (t2.small): ~$18/month
- Data transfer: ~$10/month
- Backup storage: ~$5/month
- CloudTrail: ~$5/month

**Total Estimated:** ~$178/month ✅ (matches actual)

### Cost Optimization Opportunities

**After migration to Supabase:**
- ❌ RDS newsync6: -$70/month (eliminate)
- ❌ RDS newsync5: -$35/month (eliminate if unused)
- ❌ EC2 cron jobs: Migrate to n8n (no additional cost)
- ✅ Keep EC2 hosting for other websites (fyic.com.au)

**Potential Savings:** ~$105/month (~60% reduction for BOO infrastructure)

**Supabase Costs:**
- Current plan: Already paid
- Additional storage: Minimal (product data is small)
- **Net savings:** ~$100+/month

---

## Next Steps - Pending User Input

### Immediate Actions Required

1. **Get Database Access** (Choose one option)
   - **Option A:** User resets MySQL password for newsync6 via AWS Console
   - **Option B:** User provides current MySQL password
   - **Option C:** Developer provides database credentials

2. **Get EC2 Access** (To check cron jobs)
   - **Option A:** User provides SSH key files (.pem):
     - Fyic_Hosting.pem
     - findyouridealcustomersNew.pem
   - **Option B:** Use AWS Systems Manager Session Manager (if enabled)
   - **Option C:** Developer provides cron job scripts/code

3. **Contact Developer** (Optional but helpful)
   - Where are cron job scripts?
   - Which database has BOO data?
   - What suppliers are being synced?
   - API credentials for suppliers?
   - CSV download locations?

### Once Access is Granted

#### Phase 1A: Database Discovery (1 hour)
- [ ] Connect to newsync6 MySQL database
- [ ] List all databases/schemas
- [ ] Identify BOO product tables
- [ ] Export schema (table structure)
- [ ] Document relationships and indexes
- [ ] Export sample data (100 rows per table)
- [ ] Identify supplier mapping logic

#### Phase 1B: EC2 Cron Job Discovery (1 hour)
- [ ] SSH into EC2 instances
- [ ] Check crontab (`crontab -l`)
- [ ] Check system cron (/etc/cron.d/, /etc/cron.daily/)
- [ ] Find script locations
- [ ] Export all cron job scripts
- [ ] Document execution schedules
- [ ] Identify dependencies

#### Phase 1C: Supplier Integration Mapping (2 hours)
- [ ] Document API supplier (endpoint, auth, frequency)
- [ ] Document CSV supplier 1 (format, delivery method)
- [ ] Document CSV supplier 2 (format, delivery method)
- [ ] Document Elevate/Unleashed sync (already working in n8n)
- [ ] Map supplier SKUs to BigCommerce product IDs
- [ ] Identify price/inventory update logic

---

## AWS Infrastructure Report (Final Deliverable)

**Status:** 40% Complete

### Completed ✅
- [x] AWS account authentication
- [x] RDS database inventory
- [x] EC2 instance inventory
- [x] S3 bucket inventory
- [x] Lambda function check
- [x] EventBridge rules check
- [x] Cost analysis
- [x] Architecture documentation

### Pending ⏳
- [ ] Database schema export (awaiting password)
- [ ] Cron job documentation (awaiting SSH access)
- [ ] Supplier integration mapping (awaiting database access)
- [ ] Data flow diagrams (awaiting schema)
- [ ] Migration complexity assessment (awaiting complete picture)

---

## Questions for User/Developer

1. **Database:**
   - Is BOO data in newsync5 or newsync6?
   - What is the master password?
   - Are there other databases we should know about?

2. **Cron Jobs:**
   - Are cron jobs running on EC2 or locally?
   - What language are the scripts written in? (PHP, Python, Node.js?)
   - How often do they run?

3. **Suppliers:**
   - Which supplier uses the API? (Name, endpoint, auth method)
   - Which 2 suppliers use CSV? (Names, how are CSVs received?)
   - Are there credentials stored somewhere?

4. **Developer:**
   - Can we contact the developer for a handover session?
   - Are there any documentation or README files?
   - Where is the source code stored?

---

## Risk Assessment

### Migration Risks

**HIGH RISK:**
- ⚠️ **Unknown cron job location** - If running on dev's local machine, could break without notice
- ⚠️ **No documentation** - Relying on reverse engineering the database
- ⚠️ **Unknown supplier credentials** - Need to identify and migrate API keys

**MEDIUM RISK:**
- ⚠️ **Database schema complexity** - Unknown until we access it
- ⚠️ **Data quality issues** - 10,000+ products may have inconsistencies
- ⚠️ **Supplier API changes** - Old integrations may be outdated

**LOW RISK:**
- ✅ **n8n workflow migration** - Proven pattern from other integrations
- ✅ **Supabase capacity** - More than sufficient for product data
- ✅ **BigCommerce API** - Well documented and stable

---

## Success Criteria for Phase 1 Completion

- [x] All AWS resources documented
- [ ] Database schema exported and understood
- [ ] Cron jobs documented with scripts
- [ ] All supplier integrations mapped
- [ ] Data flow diagram created
- [ ] Migration complexity assessment complete
- [ ] Cost-benefit analysis finalized

**Current Progress:** 40%
**Blocker:** Database and EC2 access required to proceed

---

**Last Updated:** November 21, 2025
**Next Update:** After database access granted
