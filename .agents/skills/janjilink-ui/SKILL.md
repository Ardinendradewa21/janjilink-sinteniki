# JanjiLink UI/UX Expert Guidelines (UPDATED)

1. **Color Palette (Earthy Modern & Emerald):**
   - **Backgrounds:** Use `bg-stone-50` or `#FAFAFA` for the main app background to give a warm, premium feel. Never use pure white or standard cool gray (`slate`).
   - **Cards/Containers:** Use `bg-white` with `border border-stone-200` and very soft shadows (`shadow-sm`).
   - **Primary Accents:** Use `emerald-600` (or `emerald-500` for hover) for primary buttons and active states. It represents freshness, availability, and growth.
   - **Text:** Use `text-stone-900` for headings and `text-stone-500` for descriptions.

2. **Animations (Framer Motion):**
   - All Landing Page hero sections and feature grids MUST use `framer-motion` for entrance animations (e.g., initial opacity 0, y-axis 20, animate to opacity 1, y-axis 0).
   - Use `staggerChildren` for rendering lists or grids.

3. **Core Rules:**
   - Use `Inter` font.
   - Use `lucide-react` for icons.
   - Apply this theme consistently to Landing, Dashboard, and all future UI pages/components.
