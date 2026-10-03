import os
import re

HELPDESK_DIR = r'd:\Clients\BBS-ERP\frontend\src\helpdesk'
ROOT_SRC_DIR = r'd:\Clients\BBS-ERP\frontend\src'

def target_exists_in_helpdesk(import_path):
    # import_path is like "components", "telemetry", "stores/auth", "components/ListViewBuilder.vue"
    parts = import_path.split('/')
    
    # Check if the first part exists as a file or folder in helpdesk dir
    base_name = parts[0]
    
    # Check exact folder match
    folder_path = os.path.join(HELPDESK_DIR, base_name)
    if os.path.isdir(folder_path):
        return True
        
    # Check exact file match or with extension
    for ext in ['', '.ts', '.js', '.vue']:
        file_path = os.path.join(HELPDESK_DIR, base_name + ext)
        if os.path.isfile(file_path):
            return True
            
    return False

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find all imports like: from "@/something" or import "@/something"
    # match 1: import string (e.g. from ")
    # match 2: quote (" or ')
    # match 3: the path after @/
    pattern = r'(from\s+[\'"]@\/|import\s+[\'"]@\/|import\s*\([\'"]@\/)([^\'"]+)([\'"])'
    
    def replacer(match):
        prefix = match.group(1)
        path = match.group(2)
        quote = match.group(3)
        
        # Don't replace if it's already helpdesk
        if path.startswith('helpdesk/'):
            return match.group(0)
            
        if target_exists_in_helpdesk(path):
            return f'{prefix}helpdesk/{path}{quote}'
        else:
            return match.group(0)

    new_content = re.sub(pattern, replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.vue', '.js', '.ts', '.jsx', '.tsx')):
                replace_in_file(os.path.join(root, file))

if __name__ == '__main__':
    walk_dir(HELPDESK_DIR)
