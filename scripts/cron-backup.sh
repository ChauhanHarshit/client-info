#!/bin/bash

# 🔒 Automated Daily Backup Scheduler
# Approved by user on July 4, 2025

# Add this to crontab for midnight daily backups
# To install: crontab -e
# Add line: 0 0 * * * /path/to/this/script

# Navigate to project directory
cd "$(dirname "$0")/.."

# Execute daily backup
./scripts/backup-system.sh daily

# Log completion
echo "$(date '+%Y-%m-%d %H:%M:%S') - Automated daily backup completed" >> ./backups/cron.log