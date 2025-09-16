# Configuration for file storage paths
import os

# Storage directories - absolute paths on the server
AUDIO_FILES_DIR = os.getenv("AUDIO_FILES_DIR", "/home/arifqawi/storage/audio_files")
JSON_FILES_DIR = os.getenv("JSON_FILES_DIR", "/home/arifqawi/storage/json_files")
TRANSCRIPTION_FILES_DIR = os.getenv("TRANSCRIPTION_FILES_DIR", "/home/arifqawi/storage/transcription_files")

# Note: Directories should be created manually on the server or by Docker volume mounts
# No automatic directory creation as these are external to the container

# Database connection (you can add this if needed later)
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://...")