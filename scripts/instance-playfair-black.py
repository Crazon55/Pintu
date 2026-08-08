from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from pathlib import Path
import os
import tempfile

out_srv = Path(r'C:\Users\skill\Desktop\pintu\server\assets\fonts')
out_pub = Path(r'C:\Users\skill\Desktop\pintu\public\fonts')
tmp = os.environ.get('TEMP', tempfile.gettempdir())

def set_names(font, family, style, full, ps):
    name = font['name']
    for rec in name.names:
        if rec.nameID == 1:
            rec.string = family
        elif rec.nameID == 2:
            rec.string = style
        elif rec.nameID == 4:
            rec.string = full
        elif rec.nameID == 6:
            rec.string = ps
        elif rec.nameID == 16:
            rec.string = family
        elif rec.nameID == 17:
            rec.string = style

jobs = [
    (
        Path(tmp) / 'PlayfairDisplay-VF.ttf',
        'PlayfairDisplay-Black.ttf',
        {'wght': 900},
        ('Playfair Display Black', 'Regular', 'Playfair Display Black', 'PlayfairDisplay-Black'),
    ),
    (
        Path(tmp) / 'PlayfairDisplay-Italic-VF.ttf',
        'PlayfairDisplay-BlackItalic.ttf',
        {'wght': 900},
        ('Playfair Display Black', 'Italic', 'Playfair Display Black Italic', 'PlayfairDisplay-BlackItalic'),
    ),
]

for src, name, axes, names in jobs:
    font = TTFont(str(src))
    instantiateVariableFont(font, axes, inplace=True)
    set_names(font, *names)
    for dest in (out_srv / name, out_pub / name):
        font.save(str(dest))
        print('saved', dest, dest.stat().st_size)
print('done')
