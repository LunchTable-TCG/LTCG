# ClawHub Submission via GitHub PR

## Method: Submit via Pull Request

Since you don't want to install OpenClaw, submit via GitHub PR:

### Steps:

1. **Fork the ClawHub repo:**
   ```bash
   # Go to https://github.com/openclaw/clawhub
   # Click "Fork" button
   ```

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/clawhub.git
   cd clawhub
   ```

3. **Copy your skill:**
   ```bash
   # Copy from LTCG repo to ClawHub repo
   cp -r /Users/home/Desktop/LTCG/skills/lunchtable clawhub/skills/
   ```

4. **Commit and push:**
   ```bash
   git add skills/lunchtable
   git commit -m "Add LunchTable-TCG skill"
   git push origin main
   ```

5. **Create PR:**
   - Go to https://github.com/openclaw/clawhub
   - Click "Pull Requests" → "New Pull Request"
   - Select your fork
   - Submit with description:

   ```
   # Add LunchTable-TCG Trading Card Game Skill

   ## Description
   Adds OpenClaw skill for playing LunchTable-TCG, a Yu-Gi-Oh-inspired online TCG.

   ## Features
   - Complete REST API integration
   - 24 game action endpoints
   - Chain system support
   - Full documentation and examples
   - TypeScript and Python reference implementations

   ## Skill Metadata
   - Name: lunchtable-tcg
   - Author: lunchtable
   - Version: 1.0.0
   - License: MIT

   ## Testing
   All validation checks pass (see `.validate.sh`)
   ```

### Why This Method?
- ✅ No OpenClaw installation needed
- ✅ Version controlled
- ✅ Review process built-in
- ✅ Community visibility

---

## Alternative: Web Submission

If GitHub PR doesn't work, try:
- Go to https://clawhub.ai/
- Look for "Submit Skill" or "Add Skill" button
- Upload skill directory as ZIP

---

## Alternative: Direct Contact

If neither works:
- Open issue: https://github.com/openclaw/clawhub/issues
- Ask: "How to submit skill without OpenClaw CLI?"
- Include link to your skill

