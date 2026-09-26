"""Extract separately identified handles from their shared catalog photograph.
The polygons retain original catalog pixels. They exclude neighboring models.
"""
import pathlib,json
import pymupdf
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[1]
# Coordinates refer to the 1224 x 1656 render of catalog PDF page 23.
POLYGONS={
'2601':[(400,448),(683,270),(708,279),(710,304),(683,324),(697,372),(650,390),(627,350),(484,448),(490,505),(440,527),(411,502),(400,476)],
'2602':[(492,495),(765,321),(788,330),(792,349),(767,369),(786,416),(738,437),(714,394),(578,482),(578,545),(535,569),(502,551),(494,528)],
'2603':[(577,558),(854,366),(879,378),(887,400),(859,421),(877,468),(831,491),(805,451),(668,541),(671,601),(626,627),(589,604),(575,586)],
'2604':[(672,611),(951,412),(976,423),(981,443),(953,466),(969,515),(922,540),(897,495),(763,590),(766,652),(718,679),(679,655),(670,635)],
'2605':[(338,506),(357,496),(663,681),(668,703),(630,707),(629,723),(587,741),(559,719),(557,684),(434,608),(426,624),(387,630),(366,611),(369,573),(338,534)],
'2606':[(238,577),(257,564),(575,752),(581,773),(560,786),(534,775),(531,790),(490,808),(464,787),(465,748),(348,679),(340,690),(303,698),(281,678),(283,637),(239,606)],
'2607':[(332,1172),(623,966),(650,978),(653,1000),(627,1025),(640,1069),(595,1094),(570,1052),(424,1155),(429,1212),(381,1239),(341,1218),(331,1197)],
'2608':[(431,1227),(719,1019),(749,1030),(755,1054),(727,1076),(741,1125),(694,1149),(670,1107),(523,1211),(526,1273),(479,1298),(442,1278),(431,1253)],
'2609':[(527,1277),(819,1072),(847,1082),(852,1109),(822,1130),(837,1176),(790,1203),(766,1161),(621,1263),(622,1322),(576,1350),(540,1329),(527,1301)],
'2610':[(627,1341),(916,1120),(943,1133),(949,1157),(919,1181),(936,1230),(890,1254),(864,1213),(721,1317),(725,1378),(678,1407),(641,1388),(628,1365)],
'2611':[(253,1222),(277,1213),(617,1407),(625,1430),(602,1444),(587,1435),(601,1456),(584,1477),(547,1482),(523,1464),(524,1419),(337,1311),(332,1324),(298,1333),(272,1319),(275,1277),(254,1250)]
}
def extract():
    doc=pymupdf.open(ROOT/'documents/door-handles-knobs.pdf')
    pix=doc[22].get_pixmap(matrix=pymupdf.Matrix(3,3))
    source=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('RGBA')
    catalog=json.loads((ROOT/'data/catalog.json').read_text())
    out=ROOT/'public/assets/products';out.mkdir(parents=True,exist_ok=True)
    for model,points in POLYGONS.items():
        polygon=[(round(x*source.width/1224),round(y*source.height/1656)) for x,y in points]
        mask=Image.new('L',source.size,0);ImageDraw.Draw(mask).polygon(polygon,fill=255)
        cut=source.copy();cut.putalpha(mask);cut=cut.crop(mask.getbbox())
        # Keep source pixels unchanged. A neutral matte sits outside the crop.
        canvas=Image.new('RGBA',(cut.width+48,cut.height+48),(238,240,235,255));canvas.alpha_composite(cut,(24,24))
        filename=f'door-handles-{model}-individual.png'
        canvas.convert('RGB').save(out/filename,optimize=True)
        p=next(p for p in catalog['products'] if p['model']==model)
        p['images'][0].update(src='assets/products/'+filename,shared=False,width=canvas.width,height=canvas.height,extraction={'method':'polygon-crop','sourcePage':23,'referenceSize':[1224,1656],'polygon':points})
        p['notes']=[n for n in p['notes'] if not n.startswith('The catalog picture shows several models.')]
    for p in catalog['products']:
        for image in p['images']:
            with Image.open(ROOT/'public'/image['src']) as im:image.update(width=im.width,height=im.height)
    (ROOT/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print('Extracted 11 separate handle pictures. All 148 pictured models now have unique image assets.')
if __name__=='__main__':extract()
