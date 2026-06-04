import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Views nav buttons
content = re.sub(r'<div class="sidebar-menu-divider">Views</div>.*?<!-- Category Filtering Menu -->', '<!-- Category Filtering Menu -->', content, flags=re.DOTALL)

# 2. Fix layout wrappers
# Find where the board starts
board_pattern = r'<!-- Dashboard Viewport -->\s*<section class="viewport">\s*<div class="dashboard-viewport-content">\s*<!-- LAYOUT: BOARD -->\s*<div id="layout-board" class="layout-view">\s*<div class="bento-card board-card" id="board-card">'
content = re.sub(board_pattern, '<!-- Dashboard Viewport (Bento Grid Layout) -->\n        <section class="viewport">\n          <div class="dashboard-viewport-content bento-layout">\n            \n            <!-- Left Column: Main Task Board -->\n            <div class="bento-card board-card" id="board-card">', content)

# 3. Flatten the rest
rest_pattern = r'</div>\s*</div>\s*<!-- LAYOUT: PRODUCTIVITY -->\s*<div id="layout-productivity" class="layout-view hidden">\s*<div class="bento-layout-grid" style="[^"]*">\s*(.*?)\s*</div>\s*</div>\s*<!-- LAYOUT: ANALYTICS -->\s*<div id="layout-analytics" class="layout-view hidden">\s*<div class="bento-layout-grid" style="[^"]*">\s*(.*?)\s*</div>\s*</div>'

def replace_rest(m):
    prod_cards = m.group(1)
    analytics_cards = m.group(2)
    return f'</div>\n\n            <!-- Right Column: Stats & Metrics -->\n            <div class="bento-stats-column">\n{analytics_cards}\n{prod_cards}\n            </div>'

content = re.sub(rest_pattern, replace_rest, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
