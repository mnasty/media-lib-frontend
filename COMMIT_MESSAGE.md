fix(storage): Handle database errors gracefully with filesystem fallback

Improve the media library's error handling for database operations by adding
proper fallbacks to filesystem-based storage when database operations fail.
This ensures the application continues to function even when database
operations encounter issues.

Key improvements:
- Replace .get() with proper array destructuring for SQLite queries
- Add try-catch blocks around all database operations
- Implement fallback to filesystem when database operations fail
- Enhance error logging for database operations
- Return sensible defaults when database queries fail

Technical changes:
- Update database query syntax in scanDirectory method
- Add error handling around all db.select(), db.insert() operations
- Implement graceful degradation to filesystem-only operation
- Return empty arrays or undefined for failed database queries
- Add detailed error logging for debugging database issues

Testing:
The changes have been tested with both working and non-working database
configurations to ensure reliable operation in all scenarios.