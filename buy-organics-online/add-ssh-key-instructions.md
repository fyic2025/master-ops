# Add New SSH Key to EC2 Instance

## Overview
Adding a new SSH key to the running EC2 instance without losing the old one.

**Estimated Time:** 10-15 minutes
**Downtime:** 3-5 minutes (cron will resume automatically)

---

## Phase 1: Create New Key Pair ✅

1. Go to EC2 → Key Pairs
2. Create key pair:
   - Name: `boo-migration-access`
   - Type: RSA
   - Format: .pem
3. Download and save the .pem file securely

---

## Phase 2: Extract Public Key

**On your local computer:**

### Mac/Linux:
```bash
# Navigate to where you saved the key
cd ~/Downloads

# Set correct permissions
chmod 400 boo-migration-access.pem

# Extract public key
ssh-keygen -y -f boo-migration-access.pem > boo-migration-access.pub

# View the public key (you'll need this)
cat boo-migration-access.pub
```

### Windows (PowerShell):
```powershell
# Navigate to Downloads
cd $HOME\Downloads

# Extract public key using ssh-keygen (Git Bash or WSL required)
ssh-keygen -y -f boo-migration-access.pem > boo-migration-access.pub

# View the public key
Get-Content boo-migration-access.pub
```

**Copy the entire public key** (starts with `ssh-rsa AAAA...`)

---

## Phase 3: Prepare Temporary Instance

**In AWS Console:**

1. Go to EC2 → Instances → Launch Instance
2. Settings:
   - Name: `temp-key-installer`
   - AMI: Amazon Linux 2023 (default)
   - Instance type: t2.micro (cheapest)
   - Key pair: Select `boo-migration-access` (the one you just created)
   - Network: Same VPC as Hosting 3.1
   - Availability Zone: **IMPORTANT - Must be same as Hosting 3.1** (check instance details)
3. Launch instance
4. Wait for status: "Running" (2-3 minutes)

---

## Phase 4: Stop Main Instance & Detach Volume

**IMPORTANT:** Notify users of 5-minute maintenance window

**In AWS Console:**

1. Select instance `i-04dc435af0436943e` (Hosting 3.1)
2. Instance State → Stop Instance
3. Wait for state: "Stopped" (~1 minute)
4. Click on instance → Storage tab
5. Click on the Root volume (usually `/dev/xvda` or `/dev/sda1`)
6. Actions → Detach Volume
7. Confirm detachment
8. **Note the device name** (e.g., `/dev/xvda`)

---

## Phase 5: Attach Volume to Temp Instance

1. Go to Volumes (left sidebar)
2. Select the detached volume from Hosting 3.1
3. Actions → Attach Volume
4. Instance: Select `temp-key-installer`
5. Device name: `/dev/sdf` (use this, not /dev/xvda)
6. Click "Attach"
7. Wait for state: "in-use"

---

## Phase 6: Add Public Key via Temp Instance

**Connect to temp instance:**

1. Select `temp-key-installer` instance
2. Click "Connect"
3. Use EC2 Instance Connect (browser) OR SSH with new key:

```bash
ssh -i boo-migration-access.pem ec2-user@<TEMP_INSTANCE_PUBLIC_IP>
```

**Once connected, run these commands:**

```bash
# Check if volume is attached
lsblk

# Create mount point
sudo mkdir -p /mnt/oldroot

# Mount the volume (device name may vary - check lsblk output)
sudo mount /dev/xvdf1 /mnt/oldroot
# OR if that fails, try:
sudo mount /dev/xvdf /mnt/oldroot

# Verify mount worked
ls /mnt/oldroot
# You should see: bin, boot, etc, home, usr, var, etc.

# Add your new public key to authorized_keys
# First, find the home directory (usually /home/ec2-user or /root)
ls /mnt/oldroot/home
ls /mnt/oldroot/root

# For ec2-user (most common):
echo "YOUR_PUBLIC_KEY_HERE" | sudo tee -a /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# OR for root:
echo "YOUR_PUBLIC_KEY_HERE" | sudo tee -a /mnt/oldroot/root/.ssh/authorized_keys

# Set correct permissions
sudo chmod 600 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys
sudo chown 1000:1000 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# Verify the key was added
sudo tail -3 /mnt/oldroot/home/ec2-user/.ssh/authorized_keys

# Unmount
sudo umount /mnt/oldroot
```

**Replace `YOUR_PUBLIC_KEY_HERE` with the actual public key from boo-migration-access.pub**

---

## Phase 7: Reattach Volume to Original Instance

**In AWS Console:**

1. Select the volume
2. Actions → Detach Volume (from temp instance)
3. Wait for state: "available"
4. Actions → Attach Volume
5. Instance: `i-04dc435af0436943e` (Hosting 3.1)
6. Device name: **Use the ORIGINAL device name** (e.g., `/dev/xvda`)
7. Click "Attach"

---

## Phase 8: Start Original Instance

1. Select instance `i-04dc435af0436943e` (Hosting 3.1)
2. Instance State → Start Instance
3. Wait for state: "Running" (~1 minute)
4. Wait for status checks: "2/2 checks passed" (~2 minutes)

---

## Phase 9: Test SSH Connection

```bash
ssh -i boo-migration-access.pem ec2-user@13.55.46.130
# OR
ssh -i boo-migration-access.pem ubuntu@13.55.46.130
# OR
ssh -i boo-migration-access.pem admin@13.55.46.130
```

**If successful, you're in!**

---

## Phase 10: Cleanup

1. Terminate the temporary instance `temp-key-installer`
2. Verify cron jobs are running:
```bash
crontab -l
sudo crontab -l
ps aux | grep cron
```

---

## Troubleshooting

**If SSH still fails:**
- Check security group allows port 22 from your IP
- Try different usernames (ec2-user, ubuntu, admin, root)
- Verify public key was added correctly:
  ```bash
  # Via temp instance
  sudo cat /mnt/oldroot/home/ec2-user/.ssh/authorized_keys
  ```

**If instance won't start:**
- Check the device name matches original (usually /dev/xvda)
- Detach and reattach with correct device name

**If you need help at any step:**
- Stop and ask before proceeding
- Take screenshots if errors occur
- The old Fyic_Hosting key still works (you're just adding a new one)

---

## Success Criteria

✅ Can SSH into instance with new key
✅ Cron jobs running (check with `crontab -l`)
✅ MySQL connection works
✅ Website still accessible (check buyorganicsonline.com.au)
✅ Original Fyic_Hosting key still works (both keys work)

---

**Estimated Total Time:** 10-15 minutes
**Downtime:** 3-5 minutes between stop and start
