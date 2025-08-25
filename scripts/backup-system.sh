#!/bin/bash

# 🔒 Database Backup System - Phase 1
# Approved by user on July 4, 2025

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${BACKUP_DIR}/backup.log"
}

# Daily automated backup function
daily_backup() {
    log_message "Starting daily backup process"
    
    # Create backup
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    
    # Verify backup was created and has content
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        log_message "SUCCESS: Daily backup created: $BACKUP_FILE"
        
        # Verify backup integrity
        if grep -q "PostgreSQL database dump complete" "$BACKUP_FILE"; then
            log_message "SUCCESS: Backup integrity verified"
        else
            log_message "WARNING: Backup integrity check failed"
        fi
    else
        log_message "ERROR: Backup creation failed"
        exit 1
    fi
    
    # Clean up old backups (retain last 30 days)
    find "$BACKUP_DIR" -name "db_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete
    log_message "Old backups cleaned up (retention: $RETENTION_DAYS days)"
}

# Pre-change backup function
pre_change_backup() {
    local change_description="$1"
    local pre_change_file="${BACKUP_DIR}/pre_change_${TIMESTAMP}.sql"
    
    log_message "Starting pre-change backup for: $change_description"
    
    # Create pre-change backup
    pg_dump "$DATABASE_URL" > "$pre_change_file"
    
    # Verify backup
    if [ -f "$pre_change_file" ] && [ -s "$pre_change_file" ]; then
        log_message "SUCCESS: Pre-change backup created: $pre_change_file"
        echo "$pre_change_file"
    else
        log_message "ERROR: Pre-change backup failed"
        exit 1
    fi
}

# Manual backup function
manual_backup() {
    local manual_file="${BACKUP_DIR}/manual_${TIMESTAMP}.sql"
    
    log_message "Starting manual backup"
    
    # Create manual backup
    pg_dump "$DATABASE_URL" > "$manual_file"
    
    # Verify backup
    if [ -f "$manual_file" ] && [ -s "$manual_file" ]; then
        log_message "SUCCESS: Manual backup created: $manual_file"
        echo "Manual backup created: $manual_file"
    else
        log_message "ERROR: Manual backup failed"
        exit 1
    fi
}

# Main execution based on parameter
case "$1" in
    "daily")
        daily_backup
        ;;
    "pre-change")
        pre_change_backup "$2"
        ;;
    "manual")
        manual_backup
        ;;
    *)
        echo "Usage: $0 {daily|pre-change|manual} [description]"
        echo "Examples:"
        echo "  $0 daily"
        echo "  $0 pre-change 'Adding new content items'"
        echo "  $0 manual"
        exit 1
        ;;
esac