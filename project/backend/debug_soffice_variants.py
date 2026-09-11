import subprocess
from pathlib import Path
from docx import Document

base = Path('C:/temp/soffice_variants')
base.mkdir(exist_ok=True)
for d in base.iterdir():
    if d.is_dir():
        for child in d.iterdir():
            child.unlink()
        d.rmdir()

for idx, (label, cmd) in enumerate([
    ('plain', ['C:/Program Files/LibreOffice/program/soffice.exe', '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', str(base), str(base/'plain.docx')]),
    ('with_env_fileuri', ['C:/Program Files/LibreOffice/program/soffice.exe', '--headless', '--norestore', '--env:UserInstallation=file:///C:/temp/soffice_variants/.profile', '--convert-to', 'pdf', '--outdir', str(base), str(base/'with_env_fileuri.docx')]),
    ('with_env_winpath', ['C:/Program Files/LibreOffice/program/soffice.exe', '--headless', '--norestore', '--env:UserInstallation=C:/temp/soffice_variants/.profile', '--convert-to', 'pdf', '--outdir', str(base), str(base/'with_env_winpath.docx')]),
    ('with_invisible', ['C:/Program Files/LibreOffice/program/soffice.exe', '--headless', '--invisible', '--convert-to', 'pdf', '--outdir', str(base), str(base/'with_invisible.docx')]),
    ('with_norestore_after', ['C:/Program Files/LibreOffice/program/soffice.exe', '--headless', '--convert-to', 'pdf', '--outdir', str(base), '--norestore', str(base/'with_norestore_after.docx')]),
], 1):
    source = base / f'{label}.docx'
    doc = Document(); doc.add_paragraph(label); doc.save(source)
    print(f'--- {label} ---')
    p = subprocess.run(cmd, capture_output=True, text=True)
    print('returncode', p.returncode)
    print('stdout', repr(p.stdout[:300]))
    print('stderr', repr(p.stderr[:300]))
    print('files', [x.name for x in base.iterdir()])
    print('pdf_count', sum(1 for x in base.iterdir() if x.suffix.lower() == '.pdf'))
