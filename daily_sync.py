"""
Daily Git Sync Automation
Analyzes today's work logs and creates intelligent commit messages
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path
import re

# Windows notification support
try:
    from win10toast import ToastNotifier
    NOTIFICATIONS_ENABLED = True
except ImportError:
    NOTIFICATIONS_ENABLED = False
    print("⚠️  win10toast not installed. Install with: pip install win10toast")

class DailySync:
    def __init__(self, base_path=None):
        """Initialize with base path to master-ops directory"""
        if base_path is None:
            # Use script location as base
            self.base_path = Path(__file__).parent
        else:
            self.base_path = Path(base_path)

        self.logs_path = self.base_path / "productivity-system" / "logs"
        self.today = datetime.now().strftime("%Y-%m-%d")
        self.toaster = ToastNotifier() if NOTIFICATIONS_ENABLED else None

    def notify(self, title, message, duration=10):
        """Send Windows notification"""
        if self.toaster:
            try:
                self.toaster.show_toast(
                    title,
                    message,
                    duration=duration,
                    threaded=True
                )
            except Exception as e:
                print(f"Notification failed: {e}")
        else:
            print(f"📢 {title}: {message}")

    def run_git_command(self, command):
        """Execute git command and return output"""
        try:
            result = subprocess.run(
                command,
                cwd=self.base_path,
                capture_output=True,
                text=True,
                shell=True
            )
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)

    def ensure_git_initialized(self):
        """Initialize git repository if it doesn't exist"""
        git_dir = self.base_path / ".git"

        if not git_dir.exists():
            print("📦 Initializing git repository...")
            success, stdout, stderr = self.run_git_command("git init")

            if not success:
                raise Exception(f"Failed to initialize git: {stderr}")

            print("✅ Git repository initialized")

            # Create .gitignore if it doesn't exist
            gitignore_path = self.base_path / ".gitignore"
            if not gitignore_path.exists():
                gitignore_path.write_text(
                    "# Python\n__pycache__/\n*.py[cod]\n*$py.class\n"
                    "*.so\n.Python\nenv/\nvenv/\n\n"
                    "# IDE\n.vscode/\n.idea/\n*.swp\n*.swo\n\n"
                    "# OS\n.DS_Store\nThumbs.db\n"
                )
                print("✅ Created .gitignore")

            return True
        return False

    def get_git_status(self):
        """Get current git status"""
        success, stdout, stderr = self.run_git_command("git status --porcelain")

        if not success:
            raise Exception(f"Failed to get git status: {stderr}")

        return stdout.strip()

    def parse_today_log(self):
        """Parse today's work log and extract completed tasks"""
        log_file = self.logs_path / f"{self.today}.md"

        if not log_file.exists():
            return None, []

        content = log_file.read_text(encoding='utf-8')

        # Extract business focus
        business_match = re.search(r'Primary Focus:\s*\[?([^\]|\n]+)', content)
        business = business_match.group(1).strip() if business_match else "Work"

        # Extract completed tasks
        completed_section = re.search(
            r'## Completed \(Actual\)(.*?)(?=##|\Z)',
            content,
            re.DOTALL
        )

        completed_tasks = []
        if completed_section:
            # Find all completed items
            tasks = re.findall(
                r'[-*]\s*\[.?\]\s*(.+?)(?:\s*-\s*\[Time:|$)',
                completed_section.group(1),
                re.MULTILINE
            )
            completed_tasks = [task.strip() for task in tasks if task.strip()]

        return business, completed_tasks

    def generate_commit_message(self, business, tasks):
        """Generate intelligent commit message based on completed work"""
        if not tasks:
            return f"Daily: Work updates - {self.today}"

        # Take first 2-3 most meaningful tasks
        key_tasks = tasks[:3]

        # Clean up task descriptions
        cleaned_tasks = []
        for task in key_tasks:
            # Remove extra formatting and timestamps
            task = re.sub(r'\[.*?\]', '', task).strip()
            # Remove leading action words if too verbose
            task = re.sub(r'^(Completed|Finished|Done)\s+', '', task, flags=re.IGNORECASE)
            cleaned_tasks.append(task)

        # Create commit message
        if len(cleaned_tasks) == 1:
            task_summary = cleaned_tasks[0]
        elif len(cleaned_tasks) == 2:
            task_summary = f"{cleaned_tasks[0]}, {cleaned_tasks[1]}"
        else:
            task_summary = f"{cleaned_tasks[0]}, {cleaned_tasks[1]}, {cleaned_tasks[2]}"

        # Capitalize first letter
        task_summary = task_summary[0].upper() + task_summary[1:] if task_summary else task_summary

        commit_msg = f"Daily: {task_summary}"

        # Add secondary message with all tasks if more than 3
        if len(tasks) > 3:
            commit_msg += f"\n\nAdditional work:\n"
            for task in tasks[3:]:
                task = re.sub(r'\[.*?\]', '', task).strip()
                commit_msg += f"- {task}\n"

        return commit_msg

    def commit_and_push(self, commit_message):
        """Add, commit, and push changes"""
        print("\n📝 Adding changes...")
        success, stdout, stderr = self.run_git_command("git add .")

        if not success:
            raise Exception(f"Failed to add changes: {stderr}")

        print("✅ Changes added")

        print("\n💾 Creating commit...")
        # Escape quotes in commit message
        safe_message = commit_message.replace('"', '\\"')
        success, stdout, stderr = self.run_git_command(f'git commit -m "{safe_message}"')

        if not success:
            if "nothing to commit" in stderr.lower():
                print("ℹ️  No changes to commit")
                return False
            else:
                raise Exception(f"Failed to commit: {stderr}")

        print("✅ Commit created")

        print("\n🚀 Pushing to remote...")
        # Check if remote exists
        success, stdout, stderr = self.run_git_command("git remote")

        if not stdout.strip():
            print("⚠️  No remote repository configured")
            print("ℹ️  Run: git remote add origin <your-repo-url>")
            return False

        success, stdout, stderr = self.run_git_command("git push")

        if not success:
            # If push fails due to no upstream, try to set it
            if "no upstream branch" in stderr.lower() or "has no upstream" in stderr.lower():
                branch_result = self.run_git_command("git branch --show-current")
                if branch_result[0]:
                    branch_name = branch_result[1].strip()
                    print(f"🔧 Setting upstream branch: {branch_name}")
                    success, stdout, stderr = self.run_git_command(
                        f"git push --set-upstream origin {branch_name}"
                    )

            if not success:
                raise Exception(f"Failed to push: {stderr}")

        print("✅ Pushed to remote")
        return True

    def log_sync(self):
        """Log the sync event in today's log file"""
        log_file = self.logs_path / f"{self.today}.md"

        if log_file.exists():
            content = log_file.read_text(encoding='utf-8')
            timestamp = datetime.now().strftime("%H:%M")

            # Add sync note at the end
            sync_note = f"\n\n---\n**Auto-sync**: {timestamp} - Changes committed and pushed to GitHub\n"

            if "Auto-sync" not in content:
                log_file.write_text(content + sync_note, encoding='utf-8')
                print(f"✅ Logged sync in {log_file.name}")

    def run(self):
        """Execute the daily sync workflow"""
        print("=" * 60)
        print("🔄 DAILY SYNC - Master Operations")
        print("=" * 60)
        print(f"📅 Date: {self.today}")
        print(f"📂 Path: {self.base_path}")
        print()

        try:
            # 1. Ensure git is initialized
            self.ensure_git_initialized()

            # 2. Check git status
            print("🔍 Checking git status...")
            status = self.get_git_status()

            if not status:
                print("ℹ️  No changes detected")
                self.notify("Daily Sync", "No changes to commit today")
                return 0

            print(f"📊 Changes detected:\n{status}\n")

            # 3. Analyze today's work log
            print("📖 Analyzing today's work log...")
            business, tasks = self.parse_today_log()

            if tasks:
                print(f"✅ Found {len(tasks)} completed tasks")
                for i, task in enumerate(tasks[:5], 1):
                    print(f"   {i}. {task[:80]}")
                if len(tasks) > 5:
                    print(f"   ... and {len(tasks) - 5} more")
            else:
                print("⚠️  No completed tasks found in today's log")

            # 4. Generate commit message
            print("\n💭 Generating commit message...")
            commit_message = self.generate_commit_message(business, tasks)
            print(f"📝 Message: {commit_message.split(chr(10))[0]}")

            # 5. Commit and push
            pushed = self.commit_and_push(commit_message)

            # 6. Log the sync
            if pushed:
                self.log_sync()

                # 7. Send notification
                self.notify(
                    "Daily Sync Complete ✅",
                    f"Committed and pushed: {commit_message.split(chr(10))[0][:100]}"
                )

            print("\n" + "=" * 60)
            print("✅ Daily sync completed successfully!")
            print("=" * 60)

            return 0

        except Exception as e:
            error_msg = f"❌ Error: {str(e)}"
            print(f"\n{error_msg}")
            self.notify("Daily Sync Failed ❌", str(e))
            return 1

def main():
    """Main entry point"""
    # Allow custom path as command line argument
    base_path = sys.argv[1] if len(sys.argv) > 1 else None

    sync = DailySync(base_path)
    exit_code = sync.run()

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
