import { type Video, type InsertVideo, type VideoMetadata } from "@shared/schema";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getMovieMetadata } from "./services/omdb";
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Configuration object for media storage settings
const STORAGE_CONFIG = {
  SAMBA_SHARE_PATH: "smb://192.168.1.5/UGH-SHARE-TWO/Media", // Replace with your actual Samba share path
  MEDIA_DIR: "./Media", // Updated to use capital M
  CACHE_VALIDITY_DURATION: 3600000 // 1 hour in milliseconds
};

export interface IStorage {
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  addVideo(video: InsertVideo): Promise<Video>;
  listDirectory(dirPath: string): Promise<VideoMetadata[]>;
  setCredentials(username: string, password: string, domain?: string): Promise<void>;
}

export class MemoryStorage implements IStorage {
  private mountPoint: string;
  private baseDir: string;
  private CACHE_VALIDITY_DURATION = STORAGE_CONFIG.CACHE_VALIDITY_DURATION;
  private credentials: {
    username?: string;
    password?: string;
    domain?: string;
  } = {};
  private platform: string;
  private architecture: string;
  private videoCache: Map<number, Video> = new Map();
  private nextId: number = 1;
  private videosListCache: {
    timestamp: number;
    videos: Video[];
  } | null = null;

  constructor() {
    this.mountPoint = path.join(process.cwd(), 'mnt');
    this.baseDir = STORAGE_CONFIG.MEDIA_DIR;
    this.platform = os.platform();
    this.architecture = os.arch();
    console.log(`Detected platform: ${this.platform}, architecture: ${this.architecture}`);
    this.initializeStorage();
  }

  private async initializeStorage() {
    const sambaSharePath = STORAGE_CONFIG.SAMBA_SHARE_PATH;
    if (!sambaSharePath) {
      console.log(`ℹ️ SAMBA_SHARE_PATH not set, using local media directory`);
      this.baseDir = STORAGE_CONFIG.MEDIA_DIR;
      await this.validateDirectory();
    } else {
      console.log(`🔄 Attempting to mount Samba share...`);
      try {
        this.baseDir = this.mountPoint;
        await this.mountSambaShare(sambaSharePath);
      } catch (error: any) {
        console.error(`❌ Samba mount failed:`, error.message);
        if (error.message.includes('only root can use "--options" option')) {
          console.log(`
⚠️  Mount failed due to insufficient permissions. You have two options:

1. Run the application with elevated privileges:
   $ sudo node server/index.js

2. Disable Samba share and use local directory:
   - Set SAMBA_SHARE_PATH to null in STORAGE_CONFIG

For security reasons, falling back to local media directory...`);
        }
        console.log(`🔄 Falling back to local media directory...`);
        this.baseDir = STORAGE_CONFIG.MEDIA_DIR;
        await this.validateDirectory();
      }
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const stats = await fs.stat(filePath);
    const hashContent = `${filePath}:${stats.size}:${stats.mtime.getTime()}`;
    return crypto.createHash('md5').update(hashContent).digest('hex');
  }

  private async verifyNetworkConnectivity(hostname: string): Promise<boolean> {
    try {
      if (this.platform === 'darwin') {
        // Use ping to check host availability on macOS
        await execAsync(`ping -c 1 -t 3 ${hostname}`);
        return true;
      } else {
        // Linux ping syntax
        await execAsync(`ping -c 1 -W 3 ${hostname}`);
        return true;
      }
    } catch (error) {
      console.error(`Network connectivity check failed for ${hostname}:`, error);
      return false;
    }
  }

  private isIpAddress(hostname: string): boolean {
    // IPv4 regex pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Pattern.test(hostname);
  }

  private async mountSambaShare(sharePath: string) {
    try {
      await fs.mkdir(this.mountPoint, { recursive: true });
      const shareUrl = new URL(sharePath);

      if (shareUrl.protocol !== 'smb:') {
        throw new Error('Invalid share protocol. Must be smb://');
      }

      // Enhanced pre-mount checks for macOS
      if (this.platform === 'darwin') {
        try {
          // Check Rosetta 2 availability for ARM64
          if (this.architecture === 'arm64') {
            try {
              await execAsync('arch -x86_64 true');
            } catch (rosettaError) {
              throw new Error('Rosetta 2 is not installed. Please install it using: sudo softwareupdate --install-rosetta');
            }
          }

          // Skip DNS resolution for IP addresses
          if (!this.isIpAddress(shareUrl.hostname)) {
            try {
              console.log('Performing DNS resolution check...');
              await execAsync(`nslookup ${shareUrl.hostname}`);
            } catch (dnsError) {
              throw new Error(`DNS resolution failed for ${shareUrl.hostname}. Please check your network settings and DNS configuration.`);
            }
          } else {
            console.log('📍 IP address detected, skipping DNS resolution check');
          }

          // Check SMB service availability
          try {
            await execAsync(`nc -z -w 3 ${shareUrl.hostname} 445`);
            console.log('✅ SMB service is available on port 445');
          } catch (smbError) {
            throw new Error(`SMB service is not accessible on ${shareUrl.hostname}:445. Please verify the server is running and the port is not blocked.`);
          }

          // Try connecting via smbutil for additional diagnostics
          try {
            await execAsync(`smbutil statshares -a guest@${shareUrl.hostname}`);
            console.log('✅ Successfully verified SMB share availability');
          } catch (smbUtilError: Error) {
            console.warn('⚠️ Additional SMB diagnostics failed, but continuing with mount attempt:', smbUtilError.message);
          }
        } catch (preCheckError: any) {
          console.error('❌ Pre-mount checks failed:', preCheckError.message);
          throw preCheckError;
        }
      }

      const mountCmd = this.buildMountCommand(shareUrl);
      console.log('🔄 Mounting share with command:', mountCmd);

      try {
        // Unmount first if already mounted
        try {
          if (this.platform === 'darwin') {
            await execAsync(`umount "${this.mountPoint}"`);
          } else {
            await execAsync(`umount -f "${this.mountPoint}"`);
          }
        } catch (unmountError) {
          console.log('ℹ️ No previous mount to clean up');
        }

        // Execute mount command with detailed output capture
        const { stdout, stderr } = await execAsync(mountCmd);
        if (stdout) console.log('📝 Mount command stdout:', stdout);
        if (stderr) console.error('⚠️ Mount command stderr:', stderr);

        // Verify mount success
        const mountCheck = await fs.access(this.mountPoint).then(() => true).catch(() => false);
        if (!mountCheck) {
          throw new Error('Mount point is not accessible after mount command succeeded');
        }

        console.log('✅ Successfully mounted share at:', this.mountPoint);

        // Verify write permissions
        try {
          const testFile = path.join(this.mountPoint, '.write_test');
          await fs.writeFile(testFile, 'test');
          await fs.unlink(testFile);
          console.log('✅ Successfully verified write permissions');
        } catch (writeError: Error) {
          console.warn('⚠️ Warning: Share mounted but may be read-only:', writeError.message);
        }

      } catch (mountError: any) {
        console.error('❌ Mount command failed:', mountError);
        this.handleMountError(mountError, sharePath, shareUrl);
      }

    } catch (error: any) {
      console.error('❌ Failed to mount share:', error.message);
      console.log('🔄 Falling back to local directory');
      this.baseDir = STORAGE_CONFIG.MEDIA_DIR;
      await this.validateDirectory();
    }
  }

  private handleMountError(error: any, sharePath: string, shareUrl: URL) {
    if (this.platform === 'darwin') {
      const archSpecificMsg = this.architecture === 'arm64'
        ? '⚠️  ARM64 architecture detected. Ensure you have Rosetta 2 installed for x86_64 compatibility.'
        : 'ℹ️  Intel architecture detected.';

      console.error(`
🔴 macOS mount error (${this.architecture}). Please check:
1. 🌐 SMB share is accessible (try connecting via Finder)
2. 🔑 You have permissions to mount volumes
3. 📝 Share path format is correct: smb://server/share
4. 👤 If using credentials, they are correct
5. 🔌 Network connectivity to the server
6. 🚦 SMB service is running on port 445
7. 🔍 DNS resolution is working correctly
${archSpecificMsg}
8. 🔧 If using ARM64, run: sudo softwareupdate --install-rosetta
9. ❌ Error details: ${error.message}

🛠️ Try these troubleshooting steps:
1. Test connection: nc -z -w 3 ${shareUrl.hostname} 445
2. Check DNS: nslookup ${shareUrl.hostname}
3. Try connecting via Finder: Go > Connect to Server > ${sharePath}
4. Check SMB version compatibility: smbutil statshares -a guest@${shareUrl.hostname}
5. Check system logs: sudo log show --predicate 'process == "mount_smbfs"' --last 5m
      `);
    } else if (this.platform === 'linux') {
      console.error(`
🔴 Linux mount error (${this.architecture}). Please check:
1. 📦 CIFS utils are installed (sudo apt-get install cifs-utils)
2. 🔑 You have correct permissions (run with sudo or add user to disk group)
3. 📝 Share path format is correct: smb://server/share
4. 👤 If using credentials, they are correct
5. 🔌 Network connectivity to the server
6. 🚦 SMB service is running on port 445
7. 🔍 DNS resolution is working correctly
8. ❌ Error details: ${error.message}

🛠️ Try these troubleshooting steps:
1. Test connection: nc -z -w 3 ${shareUrl.hostname} 445
2. Check DNS: nslookup ${shareUrl.hostname}
3. List available shares: smbclient -L ${shareUrl.hostname}
      `);
    }
    throw error;
  }

  private buildMountCommand(shareUrl: URL): string {
    try {
      const hostname = shareUrl.hostname;
      const sharePath = decodeURIComponent(shareUrl.pathname).replace(/^\//, '');
      console.log(`Attempting to mount share from ${hostname} with path ${sharePath} on ${this.platform} ${this.architecture}`);

      if (this.platform === 'darwin') {
        // macOS mount command format with enhanced options
        let cmd = this.architecture === 'arm64'
          ? 'arch -x86_64 mount_smbfs' // Use Rosetta 2 for ARM64
          : 'mount_smbfs';

        // Add mount options for better compatibility
        let mountOpts = [
          'nobrowse', // Don't show in Finder sidebar
          'rw',       // Read-write access
          'nodev',    // No device files
          'nosuid'    // No setuid files
        ];

        if (this.credentials.username) {
          const user = this.credentials.domain ?
            `${this.credentials.domain};${this.credentials.username}` :
            this.credentials.username;
          cmd += ` -o "${mountOpts.join(',')}" "//${user}:${this.credentials.password}@${hostname}/${sharePath}" "${this.mountPoint}"`;
        } else {
          cmd += ` -o "${mountOpts.join(',')}" "//guest@${hostname}/${sharePath}" "${this.mountPoint}"`;
        }
        return cmd;
      } else {
        // Linux mount command format with architecture-specific options
        let cmd = `mount -t cifs //${hostname}/${sharePath} "${this.mountPoint}"`;
        let options = [];

        if (this.credentials.username) {
          options.push(`username=${this.credentials.username}`);
          if (this.credentials.password) {
            options.push(`password=${this.credentials.password}`);
          }
          if (this.credentials.domain) {
            options.push(`domain=${this.credentials.domain}`);
          }
        } else {
          options.push('guest');
        }

        // Add architecture-specific options
        if (this.architecture === 'x64') {
          options.push('vers=3.0', 'sec=ntlmssp'); // SMB3 for modern systems
        } else {
          options.push('vers=2.1'); // SMB2 for better compatibility
        }

        // Add common mount options
        options.push('rw', 'iocharset=utf8', 'file_mode=0777', 'dir_mode=0777');

        cmd += ` -o ${options.join(',')}`;
        return cmd;
      }
    } catch (error) {
      console.error('Error building mount command:', error);
      throw error;
    }
  }

  async setCredentials(username: string, password: string, domain?: string): Promise<void> {
    this.credentials = { username, password, domain };
    if (STORAGE_CONFIG.SAMBA_SHARE_PATH) {
      await this.mountSambaShare(STORAGE_CONFIG.SAMBA_SHARE_PATH);
    }
  }

  private async validateDirectory() {
    try {
      await fs.access(this.baseDir);
      console.log(`✅ Successfully connected to media directory: ${this.baseDir}`);

      const initialFiles = await fs.readdir(this.baseDir);
      console.log(`📁 Initial directory contents:`, initialFiles);
    } catch (error) {
      console.log(`⚠️ Media directory ${this.baseDir} not found, attempting to create it...`);
      try {
        await fs.mkdir(this.baseDir, { recursive: true });
        console.log(`✅ Successfully created media directory: ${this.baseDir}`);

        // Verify the directory was created and is writable
        await fs.access(this.baseDir, fs.constants.W_OK);
        console.log(`✅ Media directory is accessible and writable`);
      } catch (mkdirError) {
        console.error(`❌ Failed to create media directory:`, mkdirError);
        throw new Error(`Unable to create or access media directory: ${this.baseDir}`);
      }
    }
  }

  private isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.avi', '.mov'].includes(ext);
    if (isVideo) {
      console.log(`🎥 Detected video file: ${filename}`);
    }
    return isVideo;
  }

  private async scanDirectory(currentPath: string, relativePath: string = ''): Promise<VideoMetadata[]> {
    try {
      const fullPath = path.join(this.baseDir, currentPath);
      console.log(`\n=== Scanning Directory ===`);
      console.log(`Path: ${fullPath}`);
      console.log(`Relative Path: ${relativePath || 'root'}`);

      try {
        await fs.access(fullPath);
        console.log(`✓ Directory is accessible`);
      } catch (error) {
        console.error(`❌ Directory not accessible: ${fullPath}`, error);
        return [];
      }

      const files = await fs.readdir(fullPath, { withFileTypes: true });
      console.log(`\nFound ${files.length} items in directory`);
      console.log(`${'='.repeat(40)}`);

      const videos: VideoMetadata[] = [];
      const scanPromises: Promise<VideoMetadata[]>[] = [];

      for (const file of files) {
        const filePath = path.join(currentPath, file.name);
        const absoluteFilePath = path.join(this.baseDir, filePath);

        if (file.isDirectory()) {
          console.log(`📁 Found subdirectory: ${file.name}`);
          console.log(`   Scanning recursively...`);
          scanPromises.push(this.scanDirectory(filePath, filePath));
        } else if (this.isVideoFile(file.name)) {
          try {
            console.log(`\n🎬 Processing video: ${file.name}`);
            const stats = await fs.stat(absoluteFilePath);
            const title = path.parse(file.name).name;
            const hash = await this.calculateFileHash(absoluteFilePath);


            console.log(`   🔍 Processing new video file: "${title}"`);
            console.log(`   Size: ${this.formatFileSize(stats.size)}`);
            console.log(`   Last Modified: ${stats.mtime.toLocaleString()}`);

            const metadata = await getMovieMetadata(title);
            console.log(`   ℹ️ Retrieved metadata:`, metadata ? '✓' : '❌');

            const videoMetadata: VideoMetadata = {
              path: filePath,
              title: title,
              size: this.formatFileSize(stats.size),
              lastModified: stats.mtime,
              hash,
              lastScanned: new Date(),
              ...metadata
            };

            videos.push(videoMetadata);
          } catch (error) {
            console.error(`   ❌ Error processing video file ${file.name}:`, error);
          }
        } else {
          console.log(`⏭️  Skipping non-video file: ${file.name}`);
        }
      }

      const subDirResults = await Promise.all(scanPromises);
      const allVideos = [...videos, ...subDirResults.flat()];

      console.log(`\n=== Scan Summary ===`);
      console.log(`Directory: ${currentPath || 'root'}`);
      console.log(`Total videos found: ${allVideos.length}`);
      console.log(`${'='.repeat(40)}\n`);

      return allVideos;
    } catch (error) {
      console.error(`\n❌ Error scanning directory ${currentPath}:`, error);
      return [];
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    const gb = mb / 1024;
    return gb.toFixed(1) + ' GB';
  }

  async getVideos(): Promise<Video[]> {
    // Check if cache is valid
    if (this.videosListCache &&
        Date.now() - this.videosListCache.timestamp < this.CACHE_VALIDITY_DURATION) {
      return this.videosListCache.videos;
    }

    // If cache is invalid or doesn't exist, scan directory and update cache
    const metadata = await this.listDirectory('');
    const videos = metadata.map(meta => ({
      ...meta,
      id: this.nextId++
    }));

    // Update cache
    this.videosListCache = {
      timestamp: Date.now(),
      videos
    };

    // Update individual video cache
    videos.forEach(video => {
      this.videoCache.set(video.id, video);
    });

    return videos;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    // Check cache first
    const cachedVideo = this.videoCache.get(id);
    if (cachedVideo) {
      return cachedVideo;
    }

    // If not in cache, try to find in the full list
    const videos = await this.getVideos();
    const video = videos.find(v => v.id === id);
    if (video) {
      this.videoCache.set(id, video);
    }
    return video;
  }

  async addVideo(insertVideo: InsertVideo): Promise<Video> {
    const video: Video = {
      ...insertVideo,
      id: this.nextId++
    };

    // Update caches
    this.videoCache.set(video.id, video);
    if (this.videosListCache) {
      this.videosListCache.videos.push(video);
    }

    return video;
  }

  async listDirectory(dirPath: string): Promise<VideoMetadata[]> {
    try {
      console.log(`\n=== Listing Directory ===`);
      console.log(`Requested path: ${dirPath}`);
      const normalizedPath = dirPath.replace(/^\/+/, '');
      console.log(`Normalized path: ${normalizedPath || 'root'}`);

      const videos = await this.scanDirectory(normalizedPath);
      console.log(`\n=== Directory Listing Summary ===`);
      console.log(`Total videos found: ${videos.length}`);
      console.log(`${'='.repeat(40)}\n`);
      return videos;
    } catch (error) {
      console.error('\n❌ Error listing directory:', error);
      return [];
    }
  }
}

export const storage = new MemoryStorage();
