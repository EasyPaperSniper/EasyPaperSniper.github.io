"""Build the compact CV PDF from index.html (reportlab, fonttools, brotli required)."""
from pathlib import Path
import base64, re
from html import unescape
from io import BytesIO
from fontTools.ttLib import TTFont as Font
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable

root=Path(__file__).resolve().parents[1]
s=(root/'cv/index.html').read_text()
font_data=base64.b64decode(re.search(r'base64,([^)]*)',s).group(1))
for weight,name in [(400,'Geist'),(600,'GeistBold')]:
 f=Font(BytesIO(font_data))
 if 'fvar' in f:f=instantiateVariableFont(f,{'wght':weight},inplace=False)
 f.flavor=None
 for record in f['name'].names:
  if record.nameID in (1,4,6):record.string=name.encode(record.getEncoding())
 b=BytesIO();f.save(b);b.seek(0)
 pdfmetrics.registerFont(TTFont(name,b))
pdfmetrics.registerFontFamily('Geist',normal='Geist',bold='GeistBold',italic='Geist',boldItalic='GeistBold')
styles={
 'body':ParagraphStyle('body',fontName='Geist',fontSize=10,leading=13.2,spaceAfter=6),
 'heading':ParagraphStyle('heading',fontName='GeistBold',fontSize=12,leading=15,spaceBefore=11,spaceAfter=7,keepWithNext=True,borderWidth=0,borderPadding=0),
 'sub':ParagraphStyle('sub',fontName='GeistBold',fontSize=9.4,leading=12,spaceBefore=5,spaceAfter=5,keepWithNext=True),
 'name':ParagraphStyle('name',fontName='GeistBold',fontSize=25,leading=30,alignment=1,spaceAfter=5),
 'contact':ParagraphStyle('contact',fontName='Geist',fontSize=9,leading=12,alignment=1,spaceAfter=8),
 'right':ParagraphStyle('right',fontName='Geist',fontSize=9.2,leading=12,alignment=2),
}
def clean(t):
 t=re.sub(r'<span[^>]*>|</span>','',t)
 t=t.replace('<strong>','<b>').replace('</strong>','</b>').replace('<em>','').replace('</em>','')
 return t.replace('&nbsp;',' ')
def para(t,style='body'):return Paragraph(clean(t),styles[style])
story=[para('Tianyu Li','name'),para('412-520-5296 | bzdlity@gmail.com | easypapersniper.github.io','contact')]
width=A4[0]-34*72/25.4
for title,body in re.findall(r'<section><h2>(.*?)</h2>(.*?)</section>',s,re.S):
 story.append(para(title,'heading'))
 rule=HRFlowable(width='100%',thickness=.4,color=colors.HexColor('#aaaaaa'),spaceAfter=7);rule.keepWithNext=True;story.append(rule)
 if title in ['Education','Employment']:
  for org,date,role,location in re.findall(r'<div class="entry"><h3>(.*?)</h3><span class="date">(.*?)</span><p>(.*?)</p><p class="location">(.*?)</p></div>',body,re.S):
   table=Table([[para('<b>'+org+'</b>'),para(date,'right')],[para(role),para(location,'right')]],colWidths=[width*.68,width*.32])
   table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
   story.extend([KeepTogether(table),Spacer(1,5)])
 elif title=='Publications':
  for subtitle,items in re.findall(r'<div class="pub-group"><h3>(.*?)</h3><ol class="publications">(.*?)</ol></div>',body,re.S):
   story.append(para(subtitle,'sub'))
   for item in re.findall(r'<li class="publication">(.*?)</li>',items,re.S):story.append(KeepTogether([para(item)]))
 elif title=='Professional Services':
  for label,items in re.findall(r'<dt>(.*?)</dt><dd>(.*?)</dd>',body,re.S):story.append(para('<b>'+label+':</b> '+items))
 else:story.append(para('Genesis: A Generative and Universal Physics Engine for Robotics and Beyond. <a href="https://genesis-embodied-ai.github.io">genesis-embodied-ai.github.io</a>'))
def footer(canvas,doc):
 canvas.setFont('Geist',8);canvas.setFillColor(colors.HexColor('#666666'));canvas.drawRightString(A4[0]-17*72/25.4,10*72/25.4,str(doc.page))
out=root/'output/pdf/Tianyu-Li-CV.pdf';out.parent.mkdir(parents=True,exist_ok=True)
doc=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=17*72/25.4,leftMargin=17*72/25.4,topMargin=14*72/25.4,bottomMargin=16*72/25.4,title='Tianyu Li - Curriculum Vitae',author='Tianyu Li')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
