import asyncio
from pathlib import Path

from docx import Document

from app.services.word_to_pdf import _build_libreoffice_command, convert_word_to_pdf

workspace = Path('C:/temp/fix-check')
workspace.mkdir(exist_ok=True)
input_path = workspace / 'demo.docx'

doc = Document()
doc.add_paragraph('hello')
doc.save(input_path)

print(_build_libreoffice_command('C:/Program Files/LibreOffice/program/soffice.exe', input_path, workspace))

async def main():
    try:
        out = await convert_word_to_pdf(input_path, workspace)
        print('OUT=', out)
        print('EXISTS=', out.exists())
        print('SIZE=', out.stat().st_size if out.exists() else None)
    except Exception:
        import traceback
        traceback.print_exc()

asyncio.run(main())
