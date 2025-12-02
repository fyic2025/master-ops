# How To Stay In Sync - Simple Guide

## The Simple Workflow

### When You START Working (Any Machine)

```bash
cd master-ops
./sync.sh
```

This gets the latest from GitHub.

### When You FINISH Working (Any Machine)

```bash
./commit-and-push.sh "what I did today"
```

Or just:
```bash
./commit-and-push.sh
```

This saves everything to GitHub.

## That's It!

**Golden Rule:** Always run `./sync.sh` when you start, and `./commit-and-push.sh` when you finish.

## If You Get An Error

Just copy the error message and ask Claude to fix it.

## Where Are These Scripts?

They're in your `master-ops` folder on every machine:
- `sync.sh` - Gets latest from GitHub
- `commit-and-push.sh` - Saves to GitHub

## Visual Guide

```
START WORK          DO WORK           FINISH WORK
    ↓                  ↓                   ↓
./sync.sh     →   Make changes   →   ./commit-and-push.sh
    ↓                                      ↓
GitHub → You                          You → GitHub
```

## First Time Setup (On Each Machine)

1. Open terminal in master-ops folder
2. Run: `chmod +x sync.sh commit-and-push.sh`
3. Done!

## Troubleshooting

**"Permission denied"**
```bash
chmod +x sync.sh commit-and-push.sh
```

**"Conflicts detected"**
→ Copy the error and ask Claude for help

**"Not a git repository"**
→ Make sure you're in the master-ops folder:
```bash
cd /path/to/master-ops
```
