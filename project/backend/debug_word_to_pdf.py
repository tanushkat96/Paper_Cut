import asyncio
from pathlib import Path

from docx import Document

from app.services.word_to_pdf import _find_libreoffice_binary, _get_libreoffice_profile_uri, convert_word_to_pdf

workspace = Path('C:/temp/api-debug-workspace')
workspace.mkdir(exist_ok=True)
input_path = workspace / 'demo.docx'

doc = Document()
doc.add_paragraph('hello')
doc.save(input_path)

print('binary=', _find_libreoffice_binary())
print('uri=', _get_libreoffice_profile_uri(workspace))

async def main():
    out = await convert_word_to_pdf(input_path, workspace)
    print('OUT=', out)
    print('EXISTS=', out.exists())
    print('SIZE=', out.stat().st_size if out.exists() else None)

asyncio.run(main())
