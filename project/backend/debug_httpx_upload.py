from pathlib import Path

import httpx
from docx import Document

workspace = Path('C:/temp/httpx-upload')
workspace.mkdir(exist_ok=True)
source = workspace / 'upload.docx'

doc = Document()
doc.add_paragraph('hello from httpx')
doc.save(source)

data = source.read_bytes()

response = httpx.post(
    'http://localhost:8000/api/v1/convert/word-to-pdf',
    files={'file': ('upload.docx', data, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')},
    timeout=180,
)

print('status=', response.status_code)
print('content_type=', response.headers.get('content-type'))
print(response.text[:500])

out = workspace / 'upload.pdf'
if response.status_code == 200:
    out.write_bytes(response.content)
    print('pdf_exists=', out.exists(), 'pdf_size=', out.stat().st_size if out.exists() else None)
