"""Render all original PDF pages for local OCR and dashboard previews."""
import pathlib, sys
import pymupdf
root=pathlib.Path(__file__).resolve().parents[1]
documents=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'documents'
out=root/'public/assets/pages';out.mkdir(parents=True,exist_ok=True)
files=[('door-handles-knobs.pdf','handles'),('sofa-legs.pdf','sofa'),('profile handles.pdf','profile'),('Door handle price list.pdf','handle-prices'),('SOFA LEG (1).pdf','sofa-prices')]
for filename,slug in files:
    document=pymupdf.open(documents/filename)
    for i,page in enumerate(document,1):
        page.get_pixmap(matrix=pymupdf.Matrix(2,2)).save(out/f'{slug}-{i:02}.jpg',jpg_quality=85)
    print(f'{filename}: {len(document)} pages')
