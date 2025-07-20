# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCraft is an open-source project that creates customized statistics and graph dashboards within 10 minutes using LLM and MCP (Model Context Protocol) based on user prompts in an on-premises environment. The project enables users without development knowledge to easily create professional data visualization web apps.

The system works by accepting natural language requests (e.g., "Show me the correlation between our company's sales and weather"), then automatically collecting data from various sources (CSV, JSON, API, databases) through an on-premises LLM orchestrator using MCP, normalizing the data, and dynamically generating personalized GIS map visualizations or statistical charts (time series, correlations, distributions, etc.).

## Project Structure

```
VibeCraft/
├── project_intro.md        # Project introduction and purpose (Korean)
├── project_rules.md        # Development rules and processes (Korean)  
├── assistant_guide.md      # Guidelines for assistants working on the project
├── sample/                 # Sample data directory
│   ├── sample_data.csv    # Basic sample data (name, age, city)
│   └── airtravel.csv      # Air travel statistics by month/year
└── CLAUDE.md              # This file
```

## Development Workflow

### 1. Data Collection and Management
- Store authentication-free public sample data (CSV, etc.) in the `sample/` folder
- When external download is not possible or authentication is required, generate representative sample CSV files directly
- Sample data examples: `sample/sample_data.csv`, `sample/airtravel.csv`
- Document data sources and generation methods

### 2. Main Development Process
1. **Data Collection & Verification** - Collect and verify topic-based sample data
2. **Database Creation** - Generate databases based on collected data
3. **Frontend Development** - Create user-friendly web frontend for data visualization and customization
4. **Git Workflow Automation** - Automate git workflows using LLM
5. **Vercel Auto-deployment** - Automatic deployment after git push
6. **User Verification** (Optional) - User verification of completed pages

## Technology Stack

- **LLM**: Gemini, Claude, others as needed
- **Frontend**: React, Next.js (subject to change based on requirements)
- **Deployment**: Vercel
- **Version Control**: Git, GitHub
- **Data Sources**: CSV, JSON, API, databases via MCP

## Development Environment Setup

Claude Code is used in WSL environment with the following setup:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs
sudo npm install -g @anthropic-ai/claude-code
```

## Working Principles

### Context Maintenance
- Always check previous work, decisions, and rules before starting new work
- Review `project_rules.md` and `assistant_guide.md` before any task
- Ensure new work doesn't conflict with existing code, rules, or structure

### Documentation Requirements
- All work must be conducted in Korean
- Document major changes, decisions, and progress in relevant files
- Always refer to `project_rules.md` as the primary reference
- Update documentation when making changes or additions

### Sample Data Guidelines
- Use authentication-free public sample data when possible
- Generate sample CSV files directly when external data is unavailable
- Store all sample data in the `sample/` folder
- Document data usage, sources, or generation methods

## File References

- `documents/project_rules.md` - Primary reference for all development rules and processes
- `documents/assistant_guide.md` - Guidelines for maintaining consistency and avoiding conflicts
- `documents/project_intro.md` - Detailed project description and expected outcomes
- `documents/project_structure.md` - Project structure and design specifications
- `documents/INDEX.md` - Documentation index and overview
- `sample/` - Contains sample datasets for development and testing

## Important Notes

- All communication and documentation should be in Korean
- Always prioritize `project_rules.md` for guidance
- Maintain consistency in code style, naming, and documentation
- Document any structural changes or rule modifications
- Verify context and avoid conflicts with existing work