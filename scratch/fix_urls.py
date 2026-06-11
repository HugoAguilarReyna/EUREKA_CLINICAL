import os
import glob
import re

def fix_urls(src_dir):
    files = glob.glob(os.path.join(src_dir, '**', '*.ts'), recursive=True)
    files.extend(glob.glob(os.path.join(src_dir, '**', '*.tsx'), recursive=True))

    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'http://localhost:8001' in content:
            # Case 1: single quotes e.g. 'http://localhost:8001/path' -> `${import.meta.env.VITE_API_URL}/path`
            content = re.sub(r"'http://localhost:8001(/[^']*)'", r"`${import.meta.env.VITE_API_URL}\1`", content)
            
            # Case 2: double quotes e.g. "http://localhost:8001/path" -> `${import.meta.env.VITE_API_URL}/path`
            content = re.sub(r'"http://localhost:8001(/[^"]*)"', r"`${import.meta.env.VITE_API_URL}\1`", content)
            
            # Case 3: already in backticks e.g. `http://localhost:8001/path/${var}` -> `${import.meta.env.VITE_API_URL}/path/${var}`
            content = content.replace('http://localhost:8001', '${import.meta.env.VITE_API_URL}')

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {filepath}")

if __name__ == '__main__':
    fix_urls(r'D:\antigravity\Eureka\Actividad1\frontend\src')
