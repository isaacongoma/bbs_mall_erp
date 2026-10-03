import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace('from "@/components"', 'from "@/helpdesk/components"').replace("from '@/components'", "from '@/helpdesk/components'")
    
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
    walk_dir(r'd:\Clients\BBS-ERP\frontend\src\helpdesk')
