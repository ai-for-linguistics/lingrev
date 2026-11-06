#!/usr/bin/env python3
"""Rebuild the bundled fictional figure comparisons (development only).

Requires matplotlib. End users do not need it: the kit ships the PNGs.
All plots use only the marginal counts in manuscript.md, not participant data.
"""
from pathlib import Path
import os
import tempfile
os.environ.setdefault('MPLCONFIGDIR', str(Path(tempfile.gettempdir()) / 'lingrev-matplotlib'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = Path(__file__).resolve().parent / 'figures'
OUT.mkdir(exist_ok=True)
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 12,
                     'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.labelcolor': '#1d2742', 'text.color': '#1d2742',
                     'xtick.color': '#5b6784', 'ytick.color': '#5b6784',
                     'savefig.facecolor': 'white'})

def finish(fig, name, note):
    fig.text(.1, .045, note, fontsize=9, color='#5b6784', va='bottom')
    fig.subplots_adjust(left=.14, right=.95, top=.84, bottom=.23)
    fig.savefig(OUT / name, dpi=140)
    plt.close(fig)

fig, ax = plt.subplots(figsize=(6, 4))
ax.bar(['A', 'B'], [18, 12], color=['#4477aa', '#ee9944'], width=.55)
ax.set(ylim=(10, 24), ylabel='Target choices', xlabel='Context', title='Context and target choices')
ax.set_yticks([10, 12, 16, 20, 24])
finish(fig, 'choices-current.png', 'Supplied demo figure: y-axis begins at 10.\nCounts from Table 1; fictional material.')

fig, ax = plt.subplots(figsize=(6, 4))
ax.bar(['A', 'B'], [18, 12], color='#3b5bc4', width=.5)
ax.set(ylim=(0, 26), ylabel='Participants selecting target', xlabel='Context', title='Target choices, with counts and denominators')
ax.set_yticks([0, 6, 12, 18, 24]);ax.grid(axis='y', alpha=.18);ax.set_axisbelow(True)
for x, (count, pct) in enumerate([(18,75),(12,50)]):
    ax.text(x, count+.6, f'{count}/24 ({pct}%)', ha='center', fontsize=12)
finish(fig, 'choices-proposed.png', 'Same reported counts. Each context: n = 24.\nNo uncertainty estimate or inferential test is shown.')

fig, ax = plt.subplots(figsize=(6, 4))
ax.barh(['A', 'B'], [75,50], color='#3b5bc4', label='Selected target', height=.5)
ax.barh(['A', 'B'], [25,50], left=[75,50], color='#dbe3f5', label='Did not select target', height=.5)
for y, (pct, count, rest) in enumerate([(75,18,6),(50,12,12)]):
    ax.text(pct/2,y,f'{count}/24',ha='center',va='center',color='white',fontsize=12)
    ax.text(pct+(100-pct)/2,y,f'{rest}/24',ha='center',va='center',fontsize=12)
ax.invert_yaxis();ax.set(xlim=(0,100),xlabel='Percentage of participants',ylabel='Context',title='Response composition within each context')
ax.legend(loc='upper center',bbox_to_anchor=(.5,-.23),ncol=2,frameon=False,fontsize=10)
fig.subplots_adjust(left=.14,right=.95,top=.82,bottom=.32)
fig.text(.1,.03,'Complement counts: 24 minus target choices.\nMarginal summaries do not reveal within-participant changes.',fontsize=9,color='#5b6784')
fig.savefig(OUT/'composition-proposed.png',dpi=140);plt.close(fig)

for proposed in (False,True):
    fig, ax = plt.subplots(figsize=(6, 3.3));ax.axis('off')
    headers=['Context','Target interpretation','Total'] if not proposed else ['Context','Target choices','Participants','Target (%)']
    rows=[['A','18','24'],['B','12','24']] if not proposed else [['A','18','24','75%'],['B','12','24','50%']]
    table=ax.table(cellText=rows,colLabels=headers,cellLoc='center',loc='center',colWidths=[.17,.55,.2] if not proposed else [.17,.3,.27,.23])
    table.auto_set_font_size(False);table.set_fontsize(11);table.scale(1,2)
    for (row,col),cell in table.get_celld().items():
        cell.set_edgecolor('#d5dbe8')
        if row==0:cell.set_facecolor('#eaf0fc');cell.set_text_props(weight='bold',color='#1d2742')
    ax.set_title('Proposed Table 1' if proposed else 'Current Table 1',fontsize=15,pad=14)
    fig.text(.08,.08,'Counts and percentages are descriptive.\nThe same 24 participants saw both contexts.' if proposed else 'Counts reproduced from the supplied manuscript.',fontsize=10,color='#5b6784')
    fig.subplots_adjust(left=.03,right=.97,top=.85,bottom=.24)
    fig.savefig(OUT/('table-proposed.png' if proposed else 'table-current.png'),dpi=140);plt.close(fig)
