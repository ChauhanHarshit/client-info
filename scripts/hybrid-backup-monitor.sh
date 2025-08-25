
#!/bin/bash

# 🔒 Hybrid Backup System Monitor
# Monitors both local and Supabase backup systems

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONITOR_LOG="${BACKUP_DIR}/hybrid-monitor.log"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [HYBRID-MONITOR] $1" | tee -a "$MONITOR_LOG"
}

# Check local backup system status
check_local_backups() {
    log_message "Checking local backup system status..."
    
    # Check if backup script exists and is executable
    if [ -x "./scripts/backup-system.sh" ]; then
        log_message "✅ Local backup script: Active and executable"
    else
        log_message "❌ Local backup script: Missing or not executable"
        return 1
    fi
    
    # Check recent local backups
    local recent_backups=$(find "$BACKUP_DIR" -name "*.sql" -mtime -7 | wc -l)
    log_message "📊 Local backups (last 7 days): $recent_backups files"
    
    # Check latest backup age
    local latest_backup=$(find "$BACKUP_DIR" -name "*.sql" -type f -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
    if [ -n "$latest_backup" ]; then
        local backup_age=$(stat -c %Y "$latest_backup")
        local current_time=$(date +%s)
        local age_hours=$(( (current_time - backup_age) / 3600 ))
        log_message "⏰ Latest local backup: $age_hours hours ago"
        
        if [ $age_hours -gt 25 ]; then
            log_message "⚠️  WARNING: Latest backup is over 25 hours old"
        fi
    else
        log_message "❌ No local backups found"
    fi
    
    return 0
}

# Check Supabase backup configuration
check_supabase_backups() {
    log_message "Checking Supabase managed backup status..."
    
    # Run Supabase backup configuration check
    if command -v node > /dev/null 2>&1; then
        if [ -f "./scripts/supabase-backup-config.js" ]; then
            node "./scripts/supabase-backup-config.js" status >> "$MONITOR_LOG" 2>&1
            log_message "✅ Supabase backup status check completed"
        else
            log_message "❌ Supabase backup config script missing"
        fi
    else
        log_message "❌ Node.js not available for Supabase checks"
    fi
}

# Generate backup system report
generate_report() {
    local report_file="${BACKUP_DIR}/backup-system-report_${TIMESTAMP}.txt"
    
    log_message "Generating hybrid backup system report..."
    
    cat > "$report_file" << EOF
# HYBRID BACKUP SYSTEM STATUS REPORT
Generated: $(date '+%Y-%m-%d %H:%M:%S')

## SYSTEM CONFIGURATION
- Primary: Local cron/script-based backups (30-day retention)
- Secondary: Supabase managed backups (35-day retention)
- Monitoring: Hybrid monitoring with sync verification

## LOCAL BACKUP SYSTEM STATUS
EOF

    # Add local backup details
    echo "### Recent Local Backups:" >> "$report_file"
    ls -la "$BACKUP_DIR"/*.sql 2>/dev/null | tail -10 >> "$report_file" || echo "No local backups found" >> "$report_file"
    
    echo "" >> "$report_file"
    echo "### Backup Script Status:" >> "$report_file"
    if [ -x "./scripts/backup-system.sh" ]; then
        echo "✅ backup-system.sh: Executable and ready" >> "$report_file"
    else
        echo "❌ backup-system.sh: Missing or not executable" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "### Cron Configuration:" >> "$report_file"
    if [ -f "./scripts/cron-backup.sh" ]; then
        echo "✅ cron-backup.sh: Available for scheduling" >> "$report_file"
        echo "To activate: crontab -e" >> "$report_file"
        echo "Add line: 0 0 * * * $(pwd)/scripts/cron-backup.sh" >> "$report_file"
    else
        echo "❌ cron-backup.sh: Missing" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## SUPABASE MANAGED BACKUP STATUS
- Configuration: Manual setup required in Supabase Dashboard
- Access: Settings > Database > Backups
- Retention: Set to maximum (35 days)
- Point-in-time recovery: Should be enabled
- Frequency: Recommended every 6 hours

## MONITORING RECOMMENDATIONS
1. Run this monitor script daily
2. Verify both systems are creating backups
3. Test restore procedures monthly
4. Monitor backup file sizes for anomalies
5. Check logs for any error patterns

## NEXT STEPS FOR FULL ACTIVATION
1. Enable Supabase managed backups in dashboard
2. Set up automated cron scheduling for local backups
3. Test restore procedures from both systems
4. Document restore workflows for emergency use

EOF

    log_message "📋 Report generated: $report_file"
    echo "$report_file"
}

# Verify backup sync status
verify_sync_status() {
    log_message "Verifying backup system synchronization..."
    
    # Check if both systems are configured
    local local_configured=false
    local supabase_configured=false
    
    if [ -x "./scripts/backup-system.sh" ] && [ -f "$BACKUP_DIR/backup.log" ]; then
        local_configured=true
        log_message "✅ Local backup system: Configured and active"
    else
        log_message "⚠️  Local backup system: Configuration incomplete"
    fi
    
    # Note: Supabase configuration check would require API access
    log_message "ℹ️  Supabase backup system: Manual verification required"
    log_message "   Check Supabase Dashboard > Settings > Database > Backups"
    
    if [ "$local_configured" = true ]; then
        log_message "🔄 Hybrid system status: Primary (local) ready, Secondary (Supabase) needs verification"
    else
        log_message "⚠️  Hybrid system status: Both systems need configuration"
    fi
}

# Main execution
case "$1" in
    "local")
        check_local_backups
        ;;
    "supabase")
        check_supabase_backups
        ;;
    "report")
        report_file=$(generate_report)
        echo "Report generated: $report_file"
        ;;
    "sync")
        verify_sync_status
        ;;
    "full"|"")
        log_message "Starting full hybrid backup system check..."
        check_local_backups
        check_supabase_backups
        verify_sync_status
        generate_report > /dev/null
        log_message "✅ Full hybrid backup check completed"
        ;;
    *)
        echo "Usage: $0 {local|supabase|report|sync|full}"
        echo "Examples:"
        echo "  $0 local     - Check local backup system only"
        echo "  $0 supabase  - Check Supabase backup system only"
        echo "  $0 report    - Generate detailed status report"
        echo "  $0 sync      - Verify synchronization status"
        echo "  $0 full      - Run complete system check (default)"
        exit 1
        ;;
esac
