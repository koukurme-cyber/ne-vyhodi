from pathlib import Path
import json,base64,re,sys
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1] if len(sys.argv)>1 else 'ne-vyhodi-game.html')
data={f.stem:'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode() for f in (root/'assets').glob('*.webp')}
parts=[]
for name in ['chapters.js','engine.js','game.js']:
 source=(root/name).read_text()
 source=re.sub(r'^import\s+[\s\S]*?from\s+[\'\"][^\'\"]+[\'\"];\s*','',source,flags=re.M)
 source=re.sub(r'^export\s*\{[^}]+\};\s*','',source,flags=re.M)
 source=re.sub(r'\bexport\s+(?=(?:const|class|function)\b)','',source)
 parts.append(source)
script='const assetData = '+json.dumps(data,separators=(',',':'))+';\n'+'\n'.join(parts)
script=script.replace('new URL(`assets/${name}.webp`, import.meta.url).href','assetData[name]')
assert 'import.meta' not in script
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>').replace('<script type="module" src="game.js"></script>','<script type="module">'+script.replace('</script','<\\/script')+'</script>')
output.write_text(html)
print(output.resolve(),len(html),'bytes')
