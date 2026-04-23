# Luckin Coffee Menu Page - Detailed UI Specification

**Source:** Decompiled APK v1.3.95
**Paths:**
- APKTool: `extracted_apks/luckin_apktool_1.3.95/base/`
- JADX: `extracted_apks/luckin_jadx_1.3.95/`

---

## 1. Page Architecture

### Activity → Fragment Chain

```text
activity_main.xml (FrameLayout)
├── AppFrameLayout (fl_main_layout, bg: platform_screen, initially invisible)
└── SplashScreenViewProvider (fl_splash_screen, initially visible)

    ↓ After splash:

platform_tab_app_frame.xml (FrameLayout)
├── FrameLayout (fl_page_container, marginBottom: ?platformTabHeight=56dp)
│   └── [Fragment pages injected here]
├── ImageView (iv_tab_bg, bg: white, height: 56dp, bottom-aligned)
└── BottomTabLayout (c_bottom_tab, bottom-aligned)

    ↓ Menu tab selected:

fragment_menu_tab.xml → fragment_product_menu.xml
```

### Bottom Tab Bar (platform_tab_bottom_item.xml)

Each tab item:
- Vertical LinearLayout, gravity: center|bottom, paddingV: 2dp
- Normal icon: 27x27dp, centered
- Selected icon: 89x48dp (larger, animated)
- Red notification dot: `platform_tab_shape_red_dot_small`
- Text: `?platformTabTextSize`, color: `platform_tab_sel_bottom_text_color`, marginTop: 2dp, marginBottom: 3dp

Tab icons (PNG assets in drawable-xhdpi):
- `ic_main_tab_menu.png` / `ic_main_tab_menu_nor.png` — Menu (active/inactive)
- `ic_main_tab_order.png` / `ic_main_tab_order_nor.png` — Orders
- `ic_main_tab_account.png` / `ic_main_tab_account_nor.png` — Account

---

## 2. Store Header Section

### Store Name Row (item_select_store.xml)

```text
LinearLayout (bg: white, paddingBottom: 5dp)
└── LinearLayout (horizontal, marginTop: 12dp)
    ├── RelativeLayout (weight: 1)
    │   ├── TextView (storeName)
    │   │   20sp bold #333333, maxLines 2, marginStart 16dp
    │   └── TextView (closeTag)
    │       10sp #fff, "CLOSE", 50dp wide, marginStart 6dp, gone
    └── ImageView (ivSearchEntry)
        36x36dp, padding 10dp, bg: bg_search (#f5f8fe, 100dp radius)
        src: icon_search, marginStart 12dp, marginEnd 16dp
```

### Store Info Row (item_store_info.xml)

```text
LinearLayout (vertical, bg: white, paddingH: 16dp, paddingBottom: 12dp)
├── LinearLayout (horizontal, marginEnd: 40dp)
│   ├── TextView (storeDistance)
│   │   12sp bold #333333, gone initially, marginEnd 4dp
│   └── TextView (storeAddress)
│       12sp #333333, drawablePadding 5dp
└── CouponListView (coupon_list)
    visibility: gone, marginTop: 8dp
```

### AppBar Scroll Behavior

```text
CoordinatorLayout
├── AppBarLayout (elevation: 0dp, bg: white)
│   └── LinearLayout (scrollFlags: scroll|enterAlways)
│       ├── item_store_info ← scrolls away
│       └── select_store_container ← scrolls away
└── FrameLayout (behavior: appbar_scrolling_view_behavior)
    └── product menu content ← fills space when AppBar collapsed
```

- `scroll|enterAlways`: Store info scrolls away on down-scroll, reappears immediately on any up-scroll
- NO `exitUntilCollapsed` — fully exits, unlike DoorDash which keeps a pinned toolbar
- NO `snap` — no snap behavior, smooth collapse

---

## 3. Two-Pane Product Menu

### Layout (fragment_product_menu.xml)

```text
FrameLayout (parent_layout, match_parent)
└── LinearLayout (horizontal, match_parent)
    ├── RecyclerView (rv_menu)
    │   width: 0dp, weight: 92
    │   height: match_parent
    │   overScrollMode: never
    │
    └── FrameLayout
        width: 0dp, weight: 286
        height: match_parent
        marginRight: 12dp
        │
        ├── CardView
        │   cardCornerRadius: 12dp
        │   cardElevation: 0dp
        │   cardBackgroundColor: transparent
        │   │
        │   └── RecyclerView (rv_goods)
        │       width: match_parent
        │       height: match_parent
        │       overScrollMode: never
        │
        └── ProductHeaderLayout (sticky_header)
            visibility: gone
            width: match_parent
            height: wrap_content
```

**Weight ratio:** 92:286 = 24.3% sidebar : 75.7% product list

### Category Sidebar Item (item_product_menu.xml)

```text
ConstraintLayout (menu_layout, 92dp wide, minHeight: 60dp)
│   bg: menu_item_bg (selector)
│
├── ImageView (index) ← ACTIVE INDICATOR
│   4dp wide, bg: menu_index_icon (#0a2db8, right-rounded 4dp)
│   marginTop: 16dp, marginBottom: 16dp
│   constraintLeft: parent, verticalBias: 0.5
│   visibility: gone (shown when selected)
│
├── FrameLayout (menu_tip_view) ← TOP-RIGHT BADGE
│   match_parent x 16dp, marginH: 8dp
│   constraintTop: parent
│   ├── TextView (menu_tip_text)
│   │   10sp bold #fff, bg: menu_left_desc_bg, paddingH: 6dp
│   │   gravity: right, singleLine
│   └── ImageView (menu_tip_image)
│       gravity: right, adjustViewBounds
│
├── ImageView (menu_icon) ← CATEGORY ICON
│   28x28dp, marginTop: 16dp, gone by default
│   centered above text
│
└── TextView (tv_menu_name) ← CATEGORY NAME
    12sp #333333, center, maxLines 2
    marginH: 8dp, marginBottom: 16dp
    goneMarginTop: 16dp (if icon hidden)
```

**Selected state (menu_item_check_bg.xml):**
```xml
<shape>
    <gradient startColor="#33a1a1a1" endColor="#33f2f2f2" angle="0" />
</shape>
```
20% opacity grey-to-light gradient, horizontal

**Unselected state (menu_item_check_tran_bg.xml):**
Fully transparent gradient

**Active indicator (menu_index_icon.xml):**
```xml
<shape android:shape="rectangle">
    <corners topRight="4dp" bottomRight="4dp" />
    <solid android:color="#0a2db8" />
</shape>
```
4dp-wide blue bar on left edge, rounded on right side only

---

## 4. Product Item Types

### Type 1: Standard Product (item_menu_product.xml)

```text
ConstraintLayout (rl_commodity, bg: white)
├── ConstraintLayout (clContent)
│   ├── ProductImageView (product_image)
│   │   100x100dp, marginTop: 8dp, marginStart: 12dp
│   ├── ImageView (sell_up) ← sold-out overlay
│   │   100x100dp, src: sell_icon, centered on product_image
│   ├── ConstraintLayout (name_layout)
│   │   marginTop: 12dp, marginStart: 8dp, marginEnd: 12dp
│   │   ├── TextView (tv_product_name)
│   │   │   16sp bold #333333, maxLines 2, ellipsize end
│   │   └── LinearLayout (name_tag_layout) ← tags after name
│   ├── NestedScrollableHost (nshFlowTag) ← flow tags
│   │   gone, marginTop: 8dp
│   │   └── FlowTagRV (rvFlowTag)
│   ├── TextView (desc)
│   │   12sp #858585, maxLines 2, marginTop: 8dp
│   ├── TextView (discount_price)
│   │   20sp bold #f95731, DIN Condensed Bold
│   ├── TextView (price) ← original price
│   │   12sp bold #c2c2c2, DIN Condensed Bold, marginLeft: 2dp
│   ├── TextView (discountPercent) ← "30% OFF" badge
│   │   10sp #f95731, bg: bg_discount_percent, paddingH: 6dp, paddingV: 2dp
│   ├── FrameLayout (fl_menu_product) ← info tip icon
│   │   20x20dp, contains 12x12dp icon
│   ├── ConstraintLayout (clDiscountContainer) ← discount labels
│   │   gone, marginTop: 2dp
│   │   ├── ImageView (discountIcon) gone
│   │   └── TextView (discountLabels) "30% OFF", 10sp #f95731
│   ├── LinearLayout (discount_time_ll) ← countdown timer
│   │   gone, marginTop: 2dp
│   │   ├── ImageView (discount_time_icon) 20x20dp
│   │   └── TextView (discount_time_countdown) 10sp #f95731
│   ├── Barrier (barrier_discount_bottom)
│   └── ImageView (favourite) 12x12dp, gone, marginTop: 2dp
└── View (line) ← divider
    bg: #efefef, 1px height, marginH: 12dp, marginTop: 12dp
```

### Type 2: Package/Bundle Product (item_menu_product_package.xml)

Same structure as standard but with:
- Package name: **18sp** bold (vs 16sp for regular)
- Sub-kind text: `tv_second_kind_package`, 12sp `#858585`, marginTop: 8dp
- Package description: 12sp `#858585`, max 2 lines
- Same 100x100dp image, same pricing layout

### Type 3: Recommendation Carousel (item_menu_product_recommend.xml)

```text
NestedScrollableHost (clipChildren: false, layerType: software)
└── RecommendRV (rvRecommend) ← horizontal RecyclerView
    marginBottom: 12dp
```

### Type 4: Recommendation Card (item_menu_product_recommend_item.xml)

```text
CardView (170dp wide, 12dp radius, 0px elevation, bg: white)
└── ConstraintLayout (paddingBottom: 12dp, marginH: 12dp)
    ├── ProductImageView (100x100dp, marginTop: 8dp, centered)
    ├── ImageView (sell_up, sold-out overlay)
    ├── TextView (tvProductName) 16sp bold #333333, maxLines: 1
    ├── TextView (discountPrice) 20sp bold #f95731, DIN Condensed Bold
    ├── TextView (price) 14sp bold #c2c2c2, DIN Condensed Bold
    ├── ImageView (favourite) 12x12dp, gone
    └── ConstraintLayout (clDiscountContainer) 20dp height
```

### Type 5: Banner (item_menu_product_banner.xml)

```text
ConstraintLayout (bg: menu_banner_default)
└── ShapeableImageView (kind_banner)
    match_parent x 54dp
    shapeAppearance: SemicircleStyle
    strokeWidth: 0dp
```

### Type 6: Category Header (item_menu_product_header.xml)

```text
ConstraintLayout (padding: 12dp)
├── TextView (kind_name) 18sp bold #333333, max 2 lines
└── NestedScrollableHost (clipChildren: false)
    └── RecyclerView (tow_kind_tabs) ← sub-category tabs
        marginTop: 8dp
```

### Type 7: Sub-Category Tab (item_menu_product_tow_kind_tab.xml)

```text
CheckedTextView
    12sp, color: menu_two_kind_tab_text (selector)
    bg: menu_two_kind_tab (pill selector)
    paddingH: 8dp, height: 20dp, marginRight: 8dp
    maxLines: 1
```

**Tab pill states (menu_two_kind_tab.xml):**
- Checked/Selected: `#f5f8fe` (light blue), 30dp radius
- Default: `#efefef` (light grey), 30dp radius

### Type 8: Secondary Product (item_menu_product_second.xml)

```text
FrameLayout (bg: white, paddingTop: 16dp)
├── TextView (second_kind_name) 12sp #333333, marginLeft: 16dp
└── TextView (fold_text_btn) 12sp #333333, gravity: right
    paddingH: 16dp, drawablePadding: 4dp (expand/collapse arrow)
```

### Type 9: Description Row (item_menu_product_desc.xml)

```text
TextView (desc) 12sp, centerVertical, match_parent x 30dp
```

### Type 10: End Group Spacer (item_menu_product_end_group.xml)

```text
FrameLayout (paddingBottom: 12dp, marginTop: -1px)
└── View (bg: menu_round_bottom_left_right, 16dp height)
    White with 12dp bottom-left + bottom-right radius
```

---

## 5. Cart System (fragment_cart.xml)

### State 1: Empty Cart FAB

```text
MaterialCardView (empty_cart_view)
    56x56dp, marginBottom: 20dp, marginEnd: 16dp
    alignParentRight, alignParentBottom
    cardCornerRadius: 50dp (circular)
    cardElevation: 8dp
    cardBackgroundColor: white
    └── ImageView (cart_icon, centered, match_parent)
```

### State 2: Gift Promotion (gift_container)

```text
ConstraintLayout (gift_container, gone initially)
    match_parent x 127dp, marginBottom: 20dp, alignParentBottom
    ├── View (gift_bg) ← background card
    │   match_parent x 90dp, marginH: 16dp
    │   bg: gift_bg drawable
    ├── LinearLayout (tv_promotion_desc_group)
    │   marginLeft: 20dp, marginTop: 8dp
    │   └── TextView (tv_promotion_desc)
    │       12sp #333333, singleLine, drawablePadding: 4dp
    ├── FrameLayout (img_gift) 58x58dp, marginEnd: 20dp
    │   ├── ImageView (img_gift_background) 48x48dp, center|bottom
    │   └── ImageView (img_gift_picture) match_parent
    └── LinearLayout (btn_git_select_container)
        marginTop: 34dp, marginEnd: 15dp
        └── TextView (btn_git_select)
            12sp bold #0022ab
            bg: cart_select_bg (stroke 1dp #0022ab, 10dp radius)
            paddingH: 14dp, paddingV: 3dp, marginTop: 10dp
```

### State 3: Active Cart Bar (fl_cart_view)

```text
FrameLayout (fl_cart_view, gone initially)
    match_parent, marginBottom: 20dp, alignParentBottom
    │
    ├── LinearLayout (ll_cart_container) ← THE CART BAR
    │   gravity: centerVertical, bg: cart_item_bg (#0a2db8, 30dp radius)
    │   marginH: 16dp, height: 55dp, paddingLeft: 52dp, paddingEnd: 20dp
    │   │
    │   ├── TextView (cart_price_discount) ← DISCOUNT PRICE
    │   │   24sp #ffffff, DIN Condensed Bold, marginStart: 14dp
    │   ├── TextView (cart_price) ← ORIGINAL PRICE
    │   │   14sp #80ffffff (50% white), DIN Condensed Bold
    │   │   marginTop: 3dp, marginStart: 4dp
    │   ├── TextView (rate) ← SAVINGS BADGE
    │   │   10sp #f95731, bg: rate_text_bg
    │   │   paddingH: 6dp, 16dp height, marginStart: 4dp
    │   └── TextView ← CHECKOUT BUTTON
    │       17sp bold #fff, text: "Checkout"
    │       gravity: end|center, weight: 1 (fills remaining)
    │
    └── FrameLayout ← LOTTIE BAG + BADGE
        ├── LottieAnimationView (lottie_cart)
        │   86x108dp, marginBottom: 5dp, marginStart: 8dp
        │   rawRes: lottie_shopping_bag
        │   autoPlay: false, loop: false
        │   progress: 1.0 (starts at end frame)
        │   speed: 0.8
        └── TextView (cart_badge) ← ITEM COUNT
            12sp bold #0022ab, DIN Condensed Bold
            bg: cart_badge_bg (white, 8dp radius)
            minWidth: 16dp, paddingH: 2.5dp
            gravity: end|bottom, marginBottom: 32dp, marginEnd: 22dp
```

---

## 6. Drawable Details

### Menu Category Shapes

| Drawable | Shape | Color | Radius |
|---|---|---|---|
| `menu_index_icon` | rectangle | `#0a2db8` | topRight: 4dp, bottomRight: 4dp |
| `menu_item_check_bg` | gradient | `#33a1a1a1` → `#33f2f2f2` | none |
| `menu_item_check_tran_bg` | gradient | transparent | none |
| `menu_round_top_left_right` | rectangle | `#ffffff` | topL: 12dp, topR: 12dp |
| `menu_round_bottom_left_right` | rectangle | `#ffffff` | bottomL: 12dp, bottomR: 12dp |
| `menu_banner_default` | rectangle | `#e4e4e4` | topL: 12dp, topR: 12dp |

### Cart Shapes

| Drawable | Shape | Color | Radius |
|---|---|---|---|
| `cart_item_bg` | rectangle | `#0a2db8` | 30dp |
| `cart_badge_bg` | rectangle | `#ffffff` | 8dp |
| `cart_bg` | rectangle | `#ffffff` | 8dp |
| `cart_gift_bg` | rectangle | `#dee9ff` | 30dp |
| `cart_select_bg` | rectangle | stroke `#0022ab` 1dp | 10dp |

### Sub-Tab Pill (menu_two_kind_tab.xml)

```xml
<!-- Checked/Selected -->
<shape><solid color="#f5f8fe" /><corners radius="30dp" /></shape>
<!-- Default -->
<shape><solid color="#efefef" /><corners radius="30dp" /></shape>
```

### Other Shapes

| Drawable | Shape | Color | Radius/Notes |
|---|---|---|---|
| `bg_search` | rectangle | `#f5f8fe` | 100dp (full round) |
| `product_image_oval` | oval | `#f8f1da` | beige coffee placeholder |

---

## 7. Animation Properties

### Pull-to-Refresh
- Rebound duration: **1000ms**
- Enable load more: **false**
- Enable refresh: **true**

### Lottie Shopping Bag
- File: `lottie_shopping_bag.json`
- Dimensions: 86x108dp (original 201x377px)
- Frame rate: 25fps
- Frame range: 136-198
- Speed: **0.8x** (slightly slower)
- Auto-play: false (triggers on cart add)
- Loop: false (plays once per add)
- Initial progress: 1.0 (shows last frame = full bag)

### AppBar Collapse
- Scroll flags: `scroll|enterAlways`
- Elevation animation: **150ms** (`app_bar_elevation_anim_duration`)
- Tab indicator animation: **300ms** (`design_tab_indicator_anim_duration_ms`)

### Bottom Sheet
- Slide in: **250ms** (mtrl_bottom_sheet_slide_in)
- Slide out: **200ms** (mtrl_bottom_sheet_slide_out)

### Fragment Transitions
- Open enter: scale 0.85→1.0 + alpha 0→1 (configMediumAnimTime ~400ms)
- Open exit: scale 1.0→1.15 + alpha 1→0
- Close enter: scale 1.1→1.0 + alpha 0→1
- Close exit: scale 1.0→0.9 + alpha 1→0
- Fade: **150ms** (fragment_fade_enter/exit)

### Custom App Animations
- Bottom panel in: **300ms** translate Y 100%→0% (decelerate cubic)
- Bottom panel out: **300ms** translate Y 0%→100% (accelerate cubic)
- Album show: **350ms** with overshoot interpolator
- Rotation: **500ms** -180°→0°
- Common alpha: **500ms** fade in/out

### Page Transitions
- Screen open enter: **400ms** slide from right (accelerate)
- Screen open exit: **400ms** slide to left (accelerate)
- Screen close enter: reverse
- Screen close exit: reverse

---

## 8. Java Source Architecture

### Key Classes

| Class | Package | Purpose |
|---|---|---|
| `MenuTabFragment` | `com.luckin.client.us.menu` | Main menu tab container |
| `ProductMenuFragment` | `com.luckin.client.us.menu.product` | Two-pane product display |
| `CartFragment` | `com.luckin.client.us.menu.cart` | Shopping cart overlay |
| `MenuViewModel` | `com.luckin.client.us.menu` | Menu tab business logic |
| `ProductMenuViewModel` | `com.luckin.client.us.menu.product` | Product list data |
| `CartViewModel` | `com.luckin.client.us.menu.cart` | Cart state management |
| `ProductAdapter` | `com.luckin.client.us.menu.product` | Multi-type product adapter |
| `MenuAdapter` (l.java) | `com.luckin.client.us.menu.product` | Category sidebar adapter |
| `ProductHeaderLayout` | `com.luckin.client.us.menu.product.view` | Sticky header view |
| `NestedScrollableHost` | `com.luckin.client.us.menu.widget` | ViewPager2 scroll resolver |
| `ProductImageView` | `com.luckin.client.us.menu.widget` | Custom product image |
| `StateErrorView` | `com.luckin.client.us.menu.widget` | Error state display |
| `MenuPricePromptView` | `com.luckin.client.us.menu.widget` | Price information |
| `CouponListView` | `com.luckin.client.us.menu.widget.couponlist` | Coupon display |
| `FlowTagRV` | `com.luckin.client.us.menu.product.view` | Product tag flow |
| `RecommendRV` | `com.luckin.client.us.menu.product.view` | Recommendation carousel |
| `TwoLevelMenu` | `com.luckin.client.us.menu.product.bean` | Two-level category model |
| `ProductBean` | `com.luckin.client.us.menu.product.bean` | Product data model |
| `MenuMemoryCacheStore` | `com.luckin.client.us.menu.cache` | In-memory menu cache |
| `GiftMenuRepository` | `com.luckin.client.us.menu.gift.rn_provider` | Gift data repository |
| `BottomTabLayout` | `com.luckin.client.platform.tab` | Custom bottom nav |
| `AppFrameLayout` | `com.luckin.client.platform.tab` | App container |
| `MediumBoldTextView` | `com.luckin.client.platform.text` | Custom bold text |
| `PageRefreshLayout` | `com.luckin.lka.refresh` | Pull-to-refresh layout |

### ProductAdapter View Types

The adapter handles 10+ view types:
1. **Header** — category header with sub-tabs (HeaderViewHolder)
2. **Banner** — promotional banner image (54dp)
3. **Product** — standard product card (100dp image)
4. **Package** — bundle/combo product (18sp name)
5. **Recommend** — horizontal carousel of recommendation cards
6. **RecommendItem** — individual 170dp card
7. **Second** — sub-category name with fold/unfold
8. **Desc** — description row (30dp)
9. **EndGroup** — bottom spacer with rounded corners
10. **GiftProduct** — gift/promo product variant
11. **GiftPackage** — gift bundle variant
12. **TwoKindTab** — sub-category pill tab (20dp)

### Scroll Sync Logic

From `ProductMenuFragment`:
1. `rv_menu` (category list) and `rv_goods` (product list) are independent RecyclerViews
2. Category tap → Fragment calls `rv_goods.scrollToPosition(categoryStartIndex)`
3. `rv_goods.onScrollListener` → detects first visible item → finds owning category → highlights in `rv_menu`
4. `ProductHeaderLayout` (sticky_header) visibility toggled based on scroll position
5. Header data bound with `ProductHeaderLayout.d(headerBean)` + `setChecked(tabPosition)`

---

## 9. Full Color Reference

### From colors.xml

```xml
<color name="skinColorPrimary">#0a2db8</color>
<color name="skinColorAccent">#f95731</color>
<color name="skinColorTextPrimary">#333333</color>
<color name="skinColorTextSecondary">#858585</color>
<color name="platform_tab_theme_color">#333999</color>
<color name="platform_tab_red_dot_color">#f05821</color>
<color name="titlebar_text_color">#333333</color>
<color name="backgroundColorNote">#ffeacc</color>
```

### Inline Colors (from layouts)

```
#f2f2f2  — page background
#ffffff  — surfaces, cards
#333333  — primary text
#858585  — secondary text
#c2c2c2  — disabled/strikethrough price
#f95731  — accent orange (prices, badges)
#0a2db8  �� primary blue (cart bar, indicator)
#0022ab  — dark blue (cart select, badge text)
#dee9ff  — light blue (gift badge bg)
#f5f8fe  — ice blue (search bg, selected tab)
#e2ecff  — arrow dropdown bg
#efefef  — divider, unselected sub-tab
#e4e4e4  — banner placeholder
#f8f1da  — beige product placeholder
#80ffffff — 50% white (cart original price)
#33a1a1a1 — 20% grey (selected category gradient start)
#33f2f2f2 — 20% light grey (selected category gradient end)
#99000000 — 60% black (popup overlay)
```

---

## 10. Dimension Reference

### From dimens.xml

```xml
<dimen name="standard_margin">16.0dp</dimen>
<dimen name="standard_double_margin">32.0dp</dimen>
<dimen name="standard_half_margin">8.0dp</dimen>
<dimen name="standard_quarter_margin">4.0dp</dimen>
<dimen name="standard_three_quarters_margin">12.0dp</dimen>
<dimen name="platformTabHeight">56.0dp</dimen>
<dimen name="platformTitleBarHeight">56.0dp</dimen>
<dimen name="platformScreenPadding">16.0dp</dimen>
<dimen name="primary_button_height">60.0dp</dimen>
<dimen name="input_height">55.0dp</dimen>
<dimen name="design_bottom_navigation_height">56.0dp</dimen>
<dimen name="design_tab_max_width">264.0dp</dimen>
<dimen name="design_tab_scrollable_min_width">72.0dp</dimen>
<dimen name="design_tab_text_size">14.0sp</dimen>
```

### Integer Animation Values

```xml
<integer name="app_bar_elevation_anim_duration">150</integer>
<integer name="bottom_sheet_slide_duration">150</integer>
<integer name="design_tab_indicator_anim_duration_ms">300</integer>
<integer name="mtrl_tab_indicator_anim_duration_ms">250</integer>
<integer name="material_motion_duration_long_1">300</integer>
<integer name="material_motion_duration_medium_1">200</integer>
<integer name="material_motion_duration_medium_2">250</integer>
```
