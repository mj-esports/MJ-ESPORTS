# MJ ESPORTS Agent Rules

## Phased Google Stitch Implementation Rule
Whenever implementing a Google Stitch design into the MJ ESPORTS project:
1. **Never Update Entire UI in a Single Prompt**: Always divide implementation into sequential, tightly scoped phases.
2. **Phase Execution Standards**:
   - Implement ONLY the components specified for the active phase.
   - Match the approved Google Stitch design pixel-perfect without simplifying or redesigning.
   - Maintain the existing cyberpunk theme, responsiveness, hover effects, micro-animations, and accessibility.
   - Preserve all existing functionality, routing, Supabase integration, and authentication.
3. **Phase Verification Checklist**:
   - Build verification with zero errors (`npm run build`).
   - Localhost display verification.
   - Bug fixes for that phase only.
4. **Stop & Wait Protocol**:
   - STOP immediately after completing the active phase.
   - Present a concise phase completion summary.
   - WAIT for explicit user approval before proceeding to the next phase. Never continue automatically.
