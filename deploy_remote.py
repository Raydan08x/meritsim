import paramiko
import time

# Configuration
HOSTNAME = "192.168.1.5"
USERNAME = "sdpi"
PASSWORD = "your_ssh_password"
REPO_URL = "https://github.com/Raydan08x/meritsim.git"
REMOTE_DIR = "/home/sdpi/meritsim"

def deploy():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"🔌 Connecting to {HOSTNAME}...")
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        
        # Check if repo exists
        stdin, stdout, stderr = ssh.exec_command(f"[ -d {REMOTE_DIR} ] && echo 'EXISTS' || echo 'MISSING'")
        status = stdout.read().decode().strip()
        
        commands = []
        if status == 'MISSING':
            print("✨ Cloning repository for the first time...")
            commands.append(f"git clone {REPO_URL} {REMOTE_DIR}")
            commands.append(f"cd {REMOTE_DIR}")
        else:
            print("🔄 Pulling latest changes...")
            commands.append(f"cd {REMOTE_DIR}")
            commands.append("git fetch origin") 
            commands.append("git reset --hard origin/main") # Force clean state and match remote history
            # commands.append("git pull origin main") # Removed to avoid unrelated history error
            
        # Add deployment commands
        commands.append("chmod +x deploy.sh")
        commands.append("sh deploy.sh")
        
        # Execute chain
        full_command = " && ".join(commands)
        print(f"🚀 Executing: {full_command}")
        
        stdin, stdout, stderr = ssh.exec_command(full_command)
        
        # Stream output
        while True:
            line = stdout.readline()
            if not line: break
            print(f"[REMOTE] {line.strip()}")
            
        print("✅ Deployment command finished.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy()
