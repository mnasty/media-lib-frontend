## Mounting Samba Share
1. Create mount point:
   ```bash
   mkdir -p ./mnt
   ```
2. Mount the share:
   ```bash
   sudo mount -t cifs //server/share ./mnt -o username=guest,password=
   ``` 