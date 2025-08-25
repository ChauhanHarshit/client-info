#!/usr/bin/env python3

import os
import subprocess
import sys
import shutil
from pathlib import Path

def force_git_resolution():
    """Force resolution of Git lock and merge conflicts"""
    
    print("Force-resolving Git lock and conflicts...")
    
    # Remove lock files directly
    git_dir = Path('.git')
    lock_files = list(git_dir.rglob('*.lock'))
    
    for lock_file in lock_files:
        try:
            lock_file.unlink()
            print(f"Removed lock file: {lock_file}")
        except Exception as e:
            print(f"Could not remove {lock_file}: {e}")
    
    # Specific lock files to remove
    specific_locks = [
        '.git/index.lock',
        '.git/HEAD.lock', 
        '.git/config.lock',
        '.git/refs/heads/main.lock'
    ]
    
    for lock_path in specific_locks:
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
                print(f"Removed: {lock_path}")
        except Exception as e:
            print(f"Could not remove {lock_path}: {e}")
    
    # Try to reset Git index
    commands = [
        ['git', 'reset', '--hard', 'HEAD'],
        ['git', 'clean', '-fd'],
        ['git', 'fetch', '--all'],
        ['git', 'reset', '--hard', 'origin/main'],
        ['git', 'status']
    ]
    
    for cmd in commands:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                print(f"✓ {' '.join(cmd)}")
                if cmd[-1] == 'status':
                    print(result.stdout)
            else:
                print(f"✗ {' '.join(cmd)}: {result.stderr}")
        except subprocess.TimeoutExpired:
            print(f"Timeout: {' '.join(cmd)}")
        except Exception as e:
            print(f"Error running {' '.join(cmd)}: {e}")
    
    print("\nGit resolution attempt complete.")
    print("Try running: git status")

if __name__ == "__main__":
    force_git_resolution()