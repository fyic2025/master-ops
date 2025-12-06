# Quick SSH Key Setup - Buy Organics Online EC2

**Your Public Key (ready to add):**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC9T3CYsv9bt8/biceah5Elw7ui3jcXHiV2P7fIwVLbFMDp6uK1ngq56NLwEZ7nJSLS1N7ybfpiTZOK0nc15Ea+w20u0ARQZAhbu6OywRVB1d+E2DNWlhlofkpLssSfdclmW1anoZvlqtd53Yk2A0CRGaqdtp/pOsJ7Y0lJDfYXwabMjuCKG322vZYY6IYYoZnavvBqionbvpCAWb1n1nUj2sE5Fxw/xnuFsMjqRqOFQvG3t7rKo3xANqxinw36hYIe9jkl4CuhTL9JhSqMtACEBmbWRIsoBDOJ+0PD1Q+Gr9BZRH2NOpG6qRiOfKsPktQixNyaaAkBps/oltwXxay3
```

**Instance Details:**
- Instance ID: `i-04dc435af0436943e`
- Name: Hosting 3.1 - [fyic.com.au]
- Public IP: 13.55.46.130
- Availability Zone: ap-southeast-2a

---

## Step 1: Launch Temporary Instance

1. Go to **EC2 → Launch Instance**
2. Settings:
   - **Name:** `temp-key-installer`
   - **AMI:** Amazon Linux 2023 (default, free tier)
   - **Instance type:** t2.micro
   - **Key pair:** Select `boo-migration-access` (the one you just created)
   - **Network settings:**
     - Same VPC as Hosting 3.1
     - **Availability Zone:** **ap-southeast-2a** (MUST match!)
   - Security group: Use default or same as Hosting 3.1
3. Click **Launch Instance**
4. Wait 2-3 minutes for status: **Running**

---

## Step 2: Stop Main Instance & Get Volume ID

1. Go to **EC2 → Instances**
2. Select **i-04dc435af0436943e** (Hosting 3.1)
3. **Instance State → Stop Instance**
4. Wait for status: **Stopped** (~1 minute)
5. Click on **Storage** tab
6. **Copy the Volume ID** (looks like `vol-xxxxx`)
7. **Note the Device name** (usually `/dev/xvda` or `/dev/sda1`)

---

## Step 3: Detach Volume

1. Go to **EC2 → Volumes** (left sidebar)
2. Find the volume ID from step 2
3. **Actions → Detach Volume**
4. Confirm
5. Wait for state: **Available**

---

## Step 4: Attach Volume to Temp Instance

1. Still in **Volumes**, select the volume
2. **Actions → Attach Volume**
3. Instance: Select **temp-key-installer**
4. Device name: `/dev/sdf` (NOT /dev/xvda)
5. Click **Attach**
6. Wait for state: **In-use**

---

## Step 5: Connect to Temp Instance & Add Key

1. Select **temp-key-installer** instance
2. Click **Connect**
3. Choose **EC2 Instance Connect** (browser-based)
4. Click **Connect**

**Once connected, run these commands:**

```bash
# Check volume is attached
lsblk

# Create mount point
sudo mkdir -p /mnt/oldroot

# Mount the volume (try xvdf1 first)
sudo mount /dev/xvdf1 /mnt/oldroot

# If that fails, try xvdf:
# sudo mount /dev/xvdf /mnt/oldroot

# Verify mount
ls /mnt/oldroot
# Should see: bin, boot, etc, home, usr, var

# Find user home directory
ls /mnt/oldroot/home
# Look for: ec2-user, ubuntu, admin, or similar

# Add public key (replace USER with actual username found above)
# For ec2-user:
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC9T3CYsv9bt8/biceah5Elw7ui3jcXHiV2P7fIwVLbFMDp6uK1ngq56NLwEZ7nJSLS1N7ybfpiTZOK0nc15Ea+w20u0ARQZAhbu6OywRVB1d+E2DNWlhlofkpLssSfdclmW1anoZvlqtd53Yk2A0CRGaqdtp/pOsJ7Y0lJDfYXwabMjuCKG322vZYY6IYYoZnavvBqionbvpCAWb1n1nUj2sE5Fxw/xnuFsMjqRqOFQvG3t7rKo3xANqxinw36hYIe9jkl4CuhTL9JhSqMtACEBmbWRIsoBDOJ+0PD1Q+Gr9BZRH2NOpG6qRiOfKsPktQixNyaaAkBps/oltwXxay3" | sudo tee -a /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# For ubuntu:
# echo "ssh-rsa AAAAB3Nza..." | sudo tee -a /mnt/oldroot/home/ubuntu/.ssh/authorized_keys

# Set correct permissions
sudo chmod 600 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys
sudo chown 1000:1000 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# Verify it was added
sudo tail -2 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# Unmount
sudo umount /mnt/oldroot
```

---

## Step 6: Reattach Volume to Main Instance

1. Go to **EC2 → Volumes**
2. Select the volume
3. **Actions → Detach Volume** (from temp instance)
4. Wait for state: **Available**
5. **Actions → Attach Volume**
6. Instance: **i-04dc435af0436943e** (Hosting 3.1)
7. Device name: **Use ORIGINAL device name** (from Step 2, usually `/dev/xvda`)
8. Click **Attach**

---

## Step 7: Start Main Instance

1. Go to **EC2 → Instances**
2. Select **i-04dc435af0436943e** (Hosting 3.1)
3. **Instance State → Start Instance**
4. Wait for status: **Running** (~1 minute)
5. Wait for status checks: **2/2 checks passed** (~2 minutes)

---

## Step 8: Test SSH Connection

**On your Windows PC, in PowerShell:**

```powershell
cd Documents
ssh -i "boo-migration-access (1).pem" ec2-user@13.55.46.130
```

**If you get "Permission denied", try different usernames:**
```powershell
ssh -i "boo-migration-access (1).pem" ubuntu@13.55.46.130
ssh -i "boo-migration-access (1).pem" admin@13.55.46.130
```

**If successful, you're in!** You should see a Linux prompt.

---

## Step 9: Cleanup

1. Go to **EC2 → Instances**
2. Select **temp-key-installer**
3. **Instance State → Terminate Instance**
4. Confirm termination

---

## Troubleshooting

**If mount fails:**
- Try `sudo mount /dev/xvdf /mnt/oldroot` (without the "1")

**If you can't find authorized_keys:**
```bash
# Create it if missing
sudo mkdir -p /mnt/oldroot/home/ec2-user/.ssh
sudo touch /mnt/oldroot/home/ec2-user/.ssh/authorized_keys
```

**If SSH still fails after setup:**
- Check you're using the right username (ec2-user, ubuntu, admin)
- Verify security group allows SSH from your IP
- Try connecting from AWS Console using EC2 Instance Connect

---

**Estimated Time:** 10-15 minutes
**Downtime:** 3-5 minutes
