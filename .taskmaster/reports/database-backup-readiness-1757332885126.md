
# 📊 Database Backup Readiness Report

**Generated**: 2025-09-08T12:01:25.125Z  
**Database Health**: ❌ ISSUES DETECTED

## Test Summary
- **Total Tests**: 4
- **Passed**: 2 ✅  
- **Failed**: 2 ❌
- **Total Duration**: 1625ms

## Detailed Results


### Database Connection
- **Status**: ✅ PASS
- **Duration**: 793ms

- **Details**: {
  "connected": true,
  "database": [
    {
      "version": "PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit",
      "current_time": "2025-09-08T12:01:24.225Z"
    }
  ]
}


### Schema Validation
- **Status**: ❌ FAIL
- **Duration**: 273ms
- **Error**: Missing critical tables: User, Trip, Booking, Notification



### Data Integrity Check
- **Status**: ❌ FAIL
- **Duration**: 2ms
- **Error**: Cannot read properties of undefined (reading 'count')



### Backup Preparation
- **Status**: ✅ PASS
- **Duration**: 557ms

- **Details**: {
  "backupId": "test-backup-1757332884569",
  "databaseSize": [
    {
      "size": "14 MB"
    }
  ],
  "tableStats": [
    {
      "schemaname": "public",
      "tablename": "group_bookings",
      "size": "64 kB",
      "bytes": "65536"
    },
    {
      "schemaname": "public",
      "tablename": "users",
      "size": "64 kB",
      "bytes": "65536"
    },
    {
      "schemaname": "public",
      "tablename": "tax_audit_logs",
      "size": "56 kB",
      "bytes": "57344"
    },
    {
      "schemaname": "public",
      "tablename": "participant_approvals",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "user_achievements",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "notification_logs",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "reviews",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "achievements",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "tax_documents",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "fisher_profiles",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "payouts",
      "size": "48 kB",
      "bytes": "49152"
    },
    {
      "schemaname": "public",
      "tablename": "catch_records",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "payment_methods",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "captain_recommendations",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "tax_reports",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "smart_recommendations",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "recommendation_interactions",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "user_notifications",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "trip_similarities",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "seasons",
      "size": "40 kB",
      "bytes": "40960"
    },
    {
      "schemaname": "public",
      "tablename": "fishing_diary_entries",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "payout_history_logs",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "competition_rankings",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "season_participants",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "competition_events",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "season_announcements",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "competitions",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "leaderboard_categories",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "competition_participants",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "reward_distributions",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "reward_inventory",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "_prisma_migrations",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "migration_events",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "tidal_data",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "accounts",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "group_trips",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "subscriptions",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "payments",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "diary_fish_catches",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "diary_media",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "weather_recommendations",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "captain_recommendation_votes",
      "size": "32 kB",
      "bytes": "32768"
    },
    {
      "schemaname": "public",
      "tablename": "webhook_event_logs",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "lunar_fishing_stats",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "fish_species_details",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "season_archives",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "user_notification_preferences",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "course_enrollments",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "courses",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "system_settings",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "reward_events",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "lunar_phases",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "fishing_conditions",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "payout_schedules",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "payment_disputes",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "fishing_hotspots",
      "size": "24 kB",
      "bytes": "24576"
    },
    {
      "schemaname": "public",
      "tablename": "rewards",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "private_bookings",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "reward_calendars",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "sessions",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "advertisements",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "fisher_badges",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "event_skill_criteria",
      "size": "16 kB",
      "bytes": "16384"
    },
    {
      "schemaname": "public",
      "tablename": "verification_tokens",
      "size": "16 kB",
      "bytes": "16384"
    }
  ],
  "timestamp": "2025-09-08T12:01:25.124Z",
  "ready": true
}


## 🎯 Backup Recommendations


⚠️ **Database issues detected - resolve before backup setup**
- Review failed tests above
- Fix connectivity or schema issues
- Re-run validation before proceeding


---
**Report generated by**: Database Backup Testing Script v1.0  
**Task**: T7.2 - Testing backup restoration procedures
