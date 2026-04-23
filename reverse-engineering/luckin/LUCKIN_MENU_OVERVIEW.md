# Luckin Coffee Menu Page - UI Overview

**Source:** Decompiled APK v1.3.95 (`extracted_apks/luckin_apktool_1.3.95/base/`)
**Architecture:** Single-Activity + Fragments + Custom Platform Tab Framework + Two-Pane Menu

---

## Key Finding: Two-Pane Split Menu with Sticky Category Header

Luckin Coffee uses a **two-pane horizontal split** layout for its menu: a narrow category sidebar (left, 92dp weight) and a product list (right, 286dp weight) inside a CardView with 12dp corner radius. A custom `ProductHeaderLayout` serves as a sticky header that overlays the product list, showing the current category name and sub-category tabs. The app is **NOT Compose** -- it's 100% XML Views + RecyclerView + ConstraintLayout.

## Page Structure

```text
RelativeLayout (fragment_menu_tab.xml)
├── PageRefreshLayout (pull-to-refresh, rebound 1000ms)
│   └── LinearLayout (vertical, bg #f2f2f2)
│       ├── View (status_bar, bg white, 0dp placeholder)
│       ├── include (item_select_store) ── store name + search button
│       └── CoordinatorLayout
│           ├── AppBarLayout (elevation 0dp, bg white)
│           │   └── LinearLayout (scrollFlags: scroll|enterAlways)
│           │       ├── include (item_store_info) ── address + coupons
│           │       └── FrameLayout (select_store_container)
│           │           └── warm_up_title "Product Preview" (20sp bold, gone)
│           └── FrameLayout (appbar_scrolling_view_behavior)
│               ├── StateErrorView (error state, gone)
│               └── LinearLayout
│                   ├── ImageView (shadow, 14dp height)
│                   └── FrameLayout (product_menu container)
│                       └── [fragment_product_menu.xml injected here]
├── BottomPopupWindowView (110.5dp, alignParentBottom)
├── FrameLayout (cart_container) ── cart overlay
└── ImageView (AI chat entry, 48x48dp, bottom-right, marginBottom 86dp)
```

## Two-Pane Product Menu (fragment_product_menu.xml)

```text
FrameLayout (parent_layout)
└── LinearLayout (horizontal)
    ├── RecyclerView (rv_menu)           ← CATEGORY SIDEBAR
    │   width: 0dp, weight: 92           (24.3% of width)
    │   overScrollMode: never
    │
    └── FrameLayout (weight: 286)        ← PRODUCT LIST AREA (75.7%)
        marginRight: 12dp
        ├── CardView (12dp radius, 0dp elevation, transparent bg)
        │   └── RecyclerView (rv_goods)  ← product items scroll here
        │       overScrollMode: never
        │
        └── ProductHeaderLayout          ← STICKY HEADER (overlays CardView)
            (sticky_header, visibility: gone initially)
```

### How the sticky header works:
1. `ProductHeaderLayout` is a sibling of the `CardView`, NOT inside it
2. It sits on top (later in z-order) with `visibility="gone"` initially
3. When the user scrolls past a category boundary, the Fragment sets it visible and binds the current category name + sub-tabs
4. Because it's a sibling overlay (not inside the scrolling RecyclerView), it stays pinned at the top of the product area

### Category sidebar (item_product_menu.xml):
- Fixed 92dp width per item, min height 60dp
- Selected state: gradient background (`#33a1a1a1` to `#33f2f2f2`)
- Unselected state: transparent
- Active indicator: 4dp-wide blue bar (`#0a2db8`) on left edge with rounded right corners
- Category icon: 28x28dp (optional, hidden by default)
- Category name: 12sp, `#333333`, center, max 2 lines
- Tip badge: 10sp bold white on colored background, top-right corner

## Scroll Behavior

```text
Phase 1 (initial view):
  ┌─────────────────────────────────┐
  │ 🏪 Store Name        🔍 Search │  ← item_select_store (AppBar)
  │ 📍 Address  | Coupons          │  ← item_store_info (AppBar)
  ├────────┬────────────────────────┤
  │ Cat 1  │ ┌─ Category Header ─┐ │
  │ Cat 2  │ │ "Hot Drinks"      │ │  ← ProductHeaderLayout (sticky)
  │ Cat 3  │ │ [Tab1][Tab2][Tab3]│ │  ← sub-category tabs
  │ Cat 4  │ ├────────────────────┤ │
  │ Cat 5  │ │ Product 1   $4.99 │ │  ← rv_goods items
  │        │ │ Product 2   $5.49 │ │
  └────────┴────────────────────────┘
  │          Cart Bar               │  ← fragment_cart.xml (floating)
  ├── Menu ──── Orders ── Account ──┤  ← BottomTabLayout

Phase 2 (scrolled - AppBar collapses):
  ┌─────────────────────────────────┐
  │ (store info scrolled away)      │  ← enterAlways: comes back on up-scroll
  ├────────┬────────────────────────┤
  │ Cat 1  │ ┌─ Sticky Header ───┐ │
  │ Cat 2  │ │ "Iced Coffee"     │ │  ← header updates as scroll crosses
  │ ●Cat 3 │ │ [Tab1][Tab2]      │ │     category boundaries
  │ Cat 4  �� ├────────────────────┤ │
  │ Cat 5  │ │ Product 7   $3.99 │ │  ← only rv_goods scrolls
  │ Cat 6  │ │ Product 8   $4.49 │ │
  └────────┴────────────────────────┘
```

### Bidirectional sync:
- **Category tap → scroll:** Tapping a category in rv_menu scrolls rv_goods to that section
- **Scroll → category:** Scrolling rv_goods updates the selected category in rv_menu
- **Sticky header:** Updates category name + sub-tabs as scroll crosses boundaries

## Design Tokens

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#0a2db8` | Category indicator, cart bar, brand CTA |
| Dark Blue | `#0022ab` | Cart select border, gift select button |
| Accent Orange | `#f95731` | Discount prices, countdown, badges |
| Light Blue | `#dee9ff` | Cart gift badge background |
| Ice Blue | `#f5f8fe` | Search background, selected sub-tab |
| Ice Blue 2 | `#e2ecff` | Arrow dropdown backgrounds |
| Dark Text | `#333333` | Primary text (product name, store name) |
| Grey Text | `#858585` | Secondary text (descriptions) |
| Disabled Text | `#c2c2c2` | Strikethrough original price |
| Semi-white | `#80ffffff` | Cart original price overlay |
| Page Background | `#f2f2f2` | Main screen background |
| Divider | `#efefef` | Product divider lines, unselected sub-tab |
| White | `#ffffff` | Card/surface backgrounds |
| Banner Default | `#e4e4e4` | Banner placeholder top corners |
| Product Oval | `#f8f1da` | Beige/coffee product image placeholder |

### Typography

**Primary Font:** System default
**Price Font:** DIN Condensed Bold (`@font/din_condensed_bold`)
**Bold Text:** `MediumBoldTextView` (custom view)

| Element | Size | Weight | Color |
|---|---|---|---|
| Store name | 20sp | bold | `#333333` |
| Category header | 18sp | bold | `#333333` |
| Product name | 16sp | bold | `#333333` |
| Discount price | 20sp | bold (DIN) | `#f95731` |
| Original price | 12sp | bold (DIN) | `#c2c2c2` strikethrough |
| Cart price | 24sp | normal (DIN) | `#ffffff` |
| Description | 12sp | normal | `#858585` |
| Category tab name | 12sp | normal | `#333333` |
| Sub-category tab | 12sp | normal | color selector |
| Discount badge | 10sp | normal | `#f95731` |
| Checkout text | 17sp | bold | `#ffffff` |

### Key Dimensions

| Component | Value |
|---|---|
| Category sidebar weight | 92 (24.3% of screen) |
| Product list weight | 286 (75.7% of screen) |
| Product list right margin | 12dp |
| Product card corner radius | 12dp |
| Product image size | 100x100dp |
| Recommend card width | 170dp |
| Recommend card radius | 12dp |
| Category item min height | 60dp |
| Category indicator width | 4dp (blue, right-rounded) |
| Category icon size | 28x28dp |
| Banner height | 54dp (ShapeableImageView) |
| Cart bar height | 55dp |
| Cart bar corner radius | 30dp |
| Cart FAB size | 56x56dp |
| Cart FAB corner radius | 50dp (circular) |
| Cart FAB elevation | 8dp |
| Cart badge min width | 16dp |
| Lottie shopping bag | 86x108dp |
| AI chat button | 48x48dp, marginBottom 86dp |
| Bottom popup height | 110.5dp |
| Search button | 36x36dp, 10dp padding, 100dp radius bg |
| Sub-tab pill height | 20dp, 30dp radius |
| Shadow strip height | 14dp |
| Divider height | 1px |
| Pull-to-refresh rebound | 1000ms |

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Kotlin + Java |
| UI Framework | XML Views (ConstraintLayout, CardView, RecyclerView) |
| Lists | RecyclerView with custom Adapters (ProductAdapter, MenuAdapter) |
| Images | Custom ProductImageView |
| Animations | Lottie (shopping bag) + Android property animators |
| State | ViewModel + LiveData |
| Navigation | Fragment-based with BottomTabLayout |
| Pull-to-refresh | Custom PageRefreshLayout |
| Scroll Handling | NestedScrollableHost (ViewPager2 conflict resolver) |
| Font | DIN Condensed Bold (prices) |
| Payments | Stripe + Adyen |
| Analytics | Firebase |
