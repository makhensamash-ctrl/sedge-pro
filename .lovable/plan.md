## Integrate Monthly Payment Option into Pre-Launch Banner

**Problem**: The banner only shows the R20,000 once-off price. Visitors don't know there's a R3,000/month option until they open the dialog.

**Solution**: Replace the single price display with a dual-option pricing block showing both plans side by side, making the monthly option immediately visible.

### Layout

```text
        ───── R100,000 ─────  (struck through)

  ┌─────────────────┐    ┌─────────────────┐
  │   R20,000       │    │   R3,000/mo      │
  │   Once-off      │    │   12 months      │
  │   Best value    │    │   (R36,000 total) │
  └─────────────────┘    └─────────────────┘

        [ Join Pre-Launch Promotion ]
```

### Changes (single file: `src/components/AprilPromotion.tsx`)

1. **Replace the single price block** (lines 97-105) with two side-by-side glassmorphic cards:
  - **Left card**: "R20,000" / "Once-off Payment" / "Best value" badge
  - **Right card**: "R3,000/mo" / "12 Monthly Instalments" 
  - Keep the struck-through R100,000 above both cards
  - Cards styled with `bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20` to match existing countdown box style
  - Responsive: side by side on sm+, stacked on mobile

No other files need changes. The dialog already handles plan selection internally.