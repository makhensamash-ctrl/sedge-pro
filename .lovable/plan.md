

## April Launch Promotion Section

A new, eye-catching promotional banner section added to the landing page between the HeroSection and AboutSection, featuring a countdown timer and strong CTA.

### Design Ideas

1. **Full-width banner with gradient background** -- dark primary with accent highlights, creating urgency and visual distinction from other sections
2. **Animated countdown timer** -- four boxes showing Days, Hours, Minutes, Seconds counting down to April 30, 2026 midnight
3. **Pulsing/glowing CTA button** -- "Join Early Bird Promotion" with a subtle animation to draw attention
4. **Checkmark feature list** -- the six included items displayed in a clean two-column grid
5. **"Valued at R100,000+" badge** -- a crossed-out value indicator to emphasize the deal
6. **Ribbon/badge** -- "Limited Time" or "April Only" floating badge on the section

### Layout

```text
┌──────────────────────────────────────────────────┐
│  🎉 APRIL LAUNCH SPECIAL OFFER                  │
│  Exclusive Launch Pricing, Available This Month  │
│                                                  │
│  We've officially launched...                    │
│  ...valued at over R100,000 per year...          │
│                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ DD  │ │ HH  │ │ MM  │ │ SS  │  COUNTDOWN     │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│  Offer valid until 30 April 2026                 │
│                                                  │
│  ✓ Remote expert support  ✓ All modules          │
│  ✓ Unlimited users        ✓ Unlimited projects   │
│  ✓ Guided onboarding      ✓ Simple & easy        │
│                                                  │
│       [ Join Early Bird Promotion ]              │
└──────────────────────────────────────────────────┘
```

### Technical Plan

1. **Create `src/components/AprilPromotion.tsx`**
   - Countdown timer using `useState` + `useEffect` with `setInterval` targeting April 30, 2026 23:59:59
   - Auto-hide section if deadline has passed
   - Framer Motion entrance animations
   - CTA button scrolls to `#pricing` section (or opens the sign-up dialog)
   - Responsive: stacked on mobile, grid on desktop

2. **Update `src/pages/Index.tsx`**
   - Import and place `AprilPromotion` between `HeroSection` and `AboutSection`

### Styling
- Dark gradient background (primary tones) to contrast with the white sections
- Accent-colored countdown boxes and CTA button
- Subtle pulse animation on the CTA button via Tailwind `animate-pulse` or custom keyframe

