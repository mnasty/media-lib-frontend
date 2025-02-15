3. Configure media directory:
   - For local media: Create a `media` directory in the project root and add your video files
   - For Samba share: Set the `SAMBA_SHARE_PATH` environment variable (see Configuration section)
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:5000 in your browser

## Configuration

### Environment Variables

- `SAMBA_SHARE_PATH`: Path to your Samba network share (e.g., "smb://0.0.0.0/share")
  - If not set, falls back to local media directory
  - Uses guest authentication by default
- `MEDIA_DIR`: Path to the local directory containing video files (default: "./media")
  - Only used when `SAMBA_SHARE_PATH` is not set
- `DATABASE_URL`: PostgreSQL database connection URL
  - Required for persistent storage of video metadata

### Using a Samba Share

To use a network share as your media source:

1. Set the `SAMBA_SHARE_PATH` environment variable to the SMB URL using the IP address format
2. The application will automatically mount the share with guest credentials
3. To use specific credentials, update them through the UI after launch

Example:
```bash
export SAMBA_SHARE_PATH="smb://0.0.0.0/movies"
npm run dev
```

### File System Caching

The application implements intelligent caching of the file system structure:
- Initial scan results are cached for 1 hour
- Subsequent launches use the cached data
- Manual refresh available through the UI
- Cache invalidation on file system changes

## Project Structure

```
├── client/          # Frontend React application
├── server/          # Express.js backend
├── shared/          # Shared types and schemas
├── media/           # Local media directory (if not using Samba)
├── mnt/             # Samba share mount point
└── migrations/      # Database migration files
