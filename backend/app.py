import os
import sys

# Ensure backend package can be imported inside Docker container
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_link = os.path.join(current_dir, "backend")
if not os.path.exists(backend_link):
    try:
        # Create a symbolic link: /app/backend -> /app
        os.symlink(".", backend_link, target_is_directory=True)
    except Exception:
        # Fallback: add parent of current directory to sys.path
        parent_dir = os.path.dirname(current_dir)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)

# Import the actual FastAPI app
from backend.api.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
