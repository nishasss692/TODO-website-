import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the missing task-list-container
task_list_fix = '''                  </button>
                </form>

                <!-- Dynamic Task List -->
                <div class="task-list scrollable-list" id="task-list-container">
                  <!-- Rendered task items go here -->
                </div>
              </div>
            </div>'''

content = re.sub(r'</button>\s*<span id="progress-percent">.*?</div>', task_list_fix, content, flags=re.DOTALL)

# Add layout-productivity
prod_html = '''            <!-- LAYOUT: PRODUCTIVITY -->
            <div id="layout-productivity" class="layout-view hidden">
              <div class="bento-layout-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <!-- Stat Card 4: Pomodoro Focus Timer -->
                <div class="bento-card stat-card pomodoro-card">
                  <div class="stat-info">
                    <span class="stat-label">Focus Timer</span>
                    <span class="stat-value" id="pomodoro-time">25:00</span>
                    <span class="stat-subtext" id="pomodoro-status">Ready to focus</span>
                  </div>
                  <div class="pomodoro-controls">
                    <button id="btn-pomodoro-start" class="btn-icon">▶</button>
                    <button id="btn-pomodoro-reset" class="btn-icon">↻</button>
                  </div>
                </div>

                <!-- Stat Card 5: Streaks & Levels -->
                <div class="bento-card stat-card streak-card">
                  <div class="stat-info">
                    <span class="stat-label">Current Streak</span>
                    <span class="stat-value" id="stat-streak-val">0 🔥</span>
                    <span class="stat-subtext" id="stat-level-val">Level 1 Novice</span>
                  </div>
                </div>

                <!-- Stat Card 6: Activity Heatmap -->
                <div class="bento-card heatmap-card">
                  <div class="heatmap-header">Activity Heatmap</div>
                  <div class="heatmap-grid" id="heatmap-grid"></div>
                </div>
              </div>
            </div>

            <!-- LAYOUT: ANALYTICS -->
            <div id="layout-analytics" class="layout-view hidden">
              <div class="bento-layout-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <!-- Stat Card 1: Completion -->
                <div class="bento-card stat-card glow-card" id="stat-completion-card">
                  <div class="stat-info">
                    <span class="stat-label">Progress</span>
                    <span class="stat-value" id="stat-progress-val">0%</span>
                    <span class="stat-subtext" id="stat-progress-sub">0 of 0 tasks done</span>
                  </div>
                  <div class="stat-visual">
                    <svg class="progress-ring" width="56" height="56">
                      <circle class="progress-ring-bg" stroke="var(--color-border)" stroke-width="4" fill="transparent" r="24" cx="28" cy="28"/>
                      <circle class="progress-ring-fill" id="stat-progress-ring" stroke="var(--color-primary)" stroke-width="4" fill="transparent" r="24" cx="28" cy="28"/>
                    </svg>
                  </div>
                </div>

                <!-- Stat Card 2: High Priority -->
                <div class="bento-card stat-card">
                  <div class="stat-info">
                    <span class="stat-label">High Priority</span>
                    <span class="stat-value" id="stat-high-val">0</span>
                    <span class="stat-subtext">Critical tasks remaining</span>
                  </div>
                  <div class="stat-visual-icon glow-red">🔴</div>
                </div>

                <!-- Stat Card 3: Deadlines -->
                <div class="bento-card stat-card">
                  <div class="stat-info">
                    <span class="stat-label">Upcoming</span>
                    <span class="stat-value" id="stat-upcoming-val">0</span>
                    <span class="stat-subtext">Due today or tomorrow</span>
                  </div>
                  <div class="stat-visual-icon glow-orange">⏳</div>
                </div>
              </div>
            </div>'''

content = content.replace('            </div>\n\n          </div>\n        </section>', prod_html + '\n\n          </div>\n        </section>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
