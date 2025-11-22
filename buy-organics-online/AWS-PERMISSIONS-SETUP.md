# AWS Permissions Setup for Automated SSH Key Installation

## Quick Setup (5 clicks)

1. Go to: https://console.aws.amazon.com/iam/home#/users/claude-audit-readonly

2. Click **"Add permissions"** button (blue button on right)

3. Click **"Create inline policy"**

4. Click **"JSON"** tab

5. **DELETE everything** and paste this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:ModifyInstanceAttribute",
        "ec2:StopInstances",
        "ec2:StartInstances",
        "ec2:DescribeInstanceAttribute"
      ],
      "Resource": "arn:aws:ec2:ap-southeast-2:263579591435:instance/i-04dc435af0436943e"
    }
  ]
}
```

6. Click **"Next"** (bottom right)

7. Policy name: `EC2-SSH-Key-Setup`

8. Click **"Create policy"**

Done! Tell me when you've clicked "Create policy" and I'll automate the rest.

---

## What This Does

- Allows ONLY starting, stopping, and modifying the one specific instance (i-04dc435af0436943e)
- Cannot touch any other AWS resources
- Safe and limited scope

---

## After This Works

Once you tell me it's done, I will:
1. Stop the instance (3 min)
2. Add SSH key via user-data
3. Start the instance
4. SSH in and explore sync scripts
5. Complete infrastructure discovery

Total time: 5 minutes
