# Luckin Coffee Menu Page - Full Code Reference

**Source:** Decompiled APK v1.3.95 (`extracted_apks/luckin_apktool_1.3.95/base/`)

---

# LAYOUTS

## activity_main.xml

```xml
<FrameLayout android:layout_width="match_parent" android:layout_height="match_parent">
    <com.luckin.client.platform.tab.AppFrameLayout android:id="@id/fl_main_layout"
        android:background="@color/platform_screen" android:visibility="invisible"
        android:layout_width="match_parent" android:layout_height="match_parent" />
    <com.luckin.client.us.splashAd.SplashScreenViewProvider android:id="@id/fl_splash_screen"
        android:visibility="visible"
        android:layout_width="match_parent" android:layout_height="match_parent" />
</FrameLayout>
```

## platform_tab_app_frame.xml

```xml
<FrameLayout android:layout_width="match_parent" android:layout_height="match_parent">
    <FrameLayout android:id="@id/fl_page_container"
        android:layout_width="match_parent" android:layout_height="match_parent"
        android:layout_marginBottom="?platformTabHeight" />
    <ImageView android:layout_gravity="bottom" android:id="@id/iv_tab_bg"
        android:background="@android:color/white"
        android:layout_width="match_parent" android:layout_height="?platformTabHeight"
        android:scaleType="centerCrop" />
    <com.luckin.client.platform.tab.BottomTabLayout android:layout_gravity="bottom"
        android:id="@id/c_bottom_tab"
        android:layout_width="match_parent" android:layout_height="wrap_content" />
</FrameLayout>
```

## platform_tab_bottom_item.xml

```xml
<LinearLayout android:gravity="center|bottom" android:orientation="vertical"
    android:paddingTop="2.0dp" android:paddingBottom="2.0dp"
    android:clipChildren="false"
    android:layout_width="match_parent" android:layout_height="wrap_content">
    <FrameLayout android:clipChildren="false"
        android:layout_width="wrap_content" android:layout_height="wrap_content">
        <ImageView android:layout_gravity="center" android:id="@id/iv_tab_icon_normal"
            android:layout_width="27.0dp" android:layout_height="27.0dp"
            android:scaleType="fitCenter"
            android:minWidth="27.0dp" android:minHeight="27.0dp" />
        <ImageView android:id="@id/iv_tab_icon_selected"
            android:layout_width="89.0dp" android:layout_height="48.0dp"
            android:scaleType="fitCenter"
            android:minWidth="27.0dp" android:minHeight="27.0dp" />
        <ImageView android:layout_gravity="right" android:id="@id/iv_tab_mine_dot"
            android:background="@drawable/platform_tab_shape_red_dot_small"
            android:visibility="gone"
            android:layout_width="wrap_content" android:layout_height="wrap_content" />
    </FrameLayout>
    <TextView android:textSize="?platformTabTextSize"
        android:textColor="@color/platform_tab_sel_bottom_text_color"
        android:gravity="center" android:id="@id/tv_tab_text"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:layout_marginTop="2.0dp" android:layout_marginBottom="3.0dp"
        android:includeFontPadding="false" />
</LinearLayout>
```

## fragment_menu_tab.xml

```xml
<RelativeLayout android:layout_width="match_parent" android:layout_height="match_parent">
    <com.luckin.lka.refresh.PageRefreshLayout android:id="@id/refresh_layout"
        android:descendantFocusability="afterDescendants"
        android:layout_width="match_parent" android:layout_height="match_parent"
        app:srlEnableLoadMore="false" app:srlEnableRefresh="true" app:srlReboundDuration="1000">
        <LinearLayout android:orientation="vertical" android:background="#f2f2f2"
            android:layout_width="match_parent" android:layout_height="match_parent">
            <View android:id="@id/status_bar" android:background="#ffffff"
                android:layout_width="match_parent" android:layout_height="0.0dp" />
            <include android:id="@id/select_store" android:visibility="gone"
                android:layout_width="match_parent" android:layout_height="wrap_content"
                layout="@layout/item_select_store" />
            <androidx.coordinatorlayout.widget.CoordinatorLayout
                android:layout_width="match_parent" android:layout_height="match_parent">
                <com.google.android.material.appbar.AppBarLayout android:id="@id/appbar"
                    android:background="@android:color/white"
                    android:layout_width="match_parent" android:layout_height="wrap_content"
                    app:elevation="0.0dp">
                    <LinearLayout android:orientation="vertical"
                        android:layout_width="match_parent" android:layout_height="wrap_content"
                        app:layout_scrollFlags="scroll|enterAlways">
                        <include android:id="@id/store_info" android:visibility="gone"
                            android:layout_width="match_parent" android:layout_height="wrap_content"
                            layout="@layout/item_store_info" />
                        <FrameLayout android:id="@id/select_store_container"
                            android:background="#ffffff"
                            android:layout_width="match_parent" android:layout_height="wrap_content">
                            <FrameLayout android:id="@id/fl_warm_up_title"
                                android:visibility="gone"
                                android:layout_width="match_parent" android:layout_height="68.0dp">
                                <com.luckin.client.platform.text.MediumBoldTextView
                                    android:textSize="20.0dp" android:textColor="@color/platform_bar_title"
                                    android:id="@id/tv_warm_up_title"
                                    android:layout_width="wrap_content" android:layout_height="wrap_content"
                                    android:layout_marginLeft="16.0dp" android:layout_marginTop="30.0dp"
                                    android:text="Product Preview" />
                            </FrameLayout>
                        </FrameLayout>
                    </LinearLayout>
                </com.google.android.material.appbar.AppBarLayout>
                <FrameLayout android:layout_width="match_parent" android:layout_height="match_parent"
                    app:layout_behavior="@string/appbar_scrolling_view_behavior">
                    <com.luckin.client.us.menu.widget.StateErrorView android:id="@id/error_view"
                        android:visibility="gone"
                        android:layout_width="match_parent" android:layout_height="match_parent" />
                    <LinearLayout android:orientation="vertical"
                        android:layout_width="match_parent" android:layout_height="wrap_content">
                        <ImageView android:id="@id/img_shadow"
                            android:background="@drawable/shadow_bg"
                            android:layout_width="match_parent" android:layout_height="14.0dp" />
                        <FrameLayout android:id="@id/product_menu"
                            android:layout_width="match_parent" android:layout_height="match_parent"
                            android:layout_marginTop="0.0dp" />
                    </LinearLayout>
                </FrameLayout>
            </androidx.coordinatorlayout.widget.CoordinatorLayout>
        </LinearLayout>
    </com.luckin.lka.refresh.PageRefreshLayout>
    <com.luckin.client.us.common.bottom.BottomPopupWindowView android:id="@id/bottom_popup"
        android:visibility="gone"
        android:layout_width="match_parent" android:layout_height="110.5dp"
        android:layout_alignParentBottom="true" />
    <FrameLayout android:id="@id/cart_container"
        android:layout_width="match_parent" android:layout_height="match_parent" />
    <ImageView android:id="@id/ivAiChatEntry" android:visibility="invisible"
        android:layout_width="48.0dp" android:layout_height="48.0dp"
        android:layout_marginBottom="86.0dp" android:src="@drawable/ic_ai_chat_entry"
        android:layout_alignParentBottom="true"
        android:layout_marginEnd="16.0dp" android:layout_alignParentEnd="true" />
</RelativeLayout>
```

## fragment_product_menu.xml

```xml
<FrameLayout android:id="@id/parent_layout"
    android:layout_width="match_parent" android:layout_height="match_parent">
    <LinearLayout android:orientation="horizontal"
        android:layout_width="match_parent" android:layout_height="match_parent">
        <androidx.recyclerview.widget.RecyclerView android:id="@id/rv_menu"
            android:layout_width="0.0dp" android:layout_height="match_parent"
            android:layout_weight="92.0" android:overScrollMode="never" />
        <FrameLayout android:layout_width="0.0dp" android:layout_height="match_parent"
            android:layout_marginRight="12.0dp" android:layout_weight="286.0">
            <androidx.cardview.widget.CardView
                android:layout_width="match_parent" android:layout_height="match_parent"
                app:cardBackgroundColor="@android:color/transparent"
                app:cardCornerRadius="12.0dp" app:cardElevation="0.0dp">
                <androidx.recyclerview.widget.RecyclerView android:id="@id/rv_goods"
                    android:layout_width="match_parent" android:layout_height="match_parent"
                    android:overScrollMode="never" />
            </androidx.cardview.widget.CardView>
            <com.luckin.client.us.menu.product.view.ProductHeaderLayout
                android:id="@id/sticky_header" android:visibility="gone"
                android:layout_width="match_parent" android:layout_height="wrap_content" />
        </FrameLayout>
    </LinearLayout>
</FrameLayout>
```

## item_select_store.xml

```xml
<LinearLayout android:background="@color/white" android:paddingBottom="5.0dp"
    android:layout_width="match_parent" android:layout_height="wrap_content">
    <LinearLayout android:gravity="center_vertical" android:orientation="horizontal"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginTop="12.0dp">
        <RelativeLayout android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_weight="1.0">
            <TextView android:textSize="20.0dp" android:textStyle="bold" android:textColor="#333333"
                android:ellipsize="end" android:id="@id/storeName"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:maxLines="2" android:layout_centerVertical="true"
                android:layout_marginStart="16.0dp" />
            <TextView android:textSize="10.0dp" android:textColor="#ffffff"
                android:gravity="center" android:layout_gravity="center"
                android:id="@id/closeTag" android:visibility="gone"
                android:layout_width="50.0dp" android:layout_height="wrap_content"
                android:text="CLOSE" android:layout_centerVertical="true"
                android:layout_marginStart="6.0dp" android:layout_toEndOf="@id/storeName" />
        </RelativeLayout>
        <ImageView android:id="@id/ivSearchEntry"
            android:background="@drawable/bg_search" android:padding="10.0dp"
            android:layout_width="36.0dp" android:layout_height="36.0dp"
            android:src="@drawable/icon_search"
            android:layout_marginStart="12.0dp" android:layout_marginEnd="16.0dp" />
    </LinearLayout>
</LinearLayout>
```

## item_store_info.xml

```xml
<LinearLayout android:orientation="vertical" android:background="@color/white"
    android:paddingLeft="16.0dp" android:paddingBottom="12.0dp"
    android:layout_width="match_parent" android:layout_height="wrap_content"
    android:paddingEnd="16.0dp">
    <LinearLayout android:orientation="horizontal"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginEnd="40.0dp">
        <TextView android:textSize="12.0dp" android:textStyle="bold" android:textColor="#333333"
            android:ellipsize="end" android:id="@id/storeDistance" android:visibility="gone"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:maxLines="1" android:layout_marginEnd="4.0dp" />
        <TextView android:textSize="12.0dp" android:textColor="#333333"
            android:ellipsize="end" android:id="@id/storeAddress"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:drawableRight="@null" android:drawablePadding="5.0dp" />
    </LinearLayout>
    <com.luckin.client.us.menu.widget.couponlist.CouponListView android:id="@id/coupon_list"
        android:visibility="gone"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginTop="8.0dp" />
</LinearLayout>
```

## item_product_menu.xml (Category Sidebar Item)

```xml
<androidx.constraintlayout.widget.ConstraintLayout android:id="@id/menu_layout"
    android:background="@drawable/menu_item_bg"
    android:layout_width="92.0dp" android:layout_height="wrap_content"
    android:minHeight="60.0dp">
    <ImageView android:id="@id/index" android:background="@drawable/menu_index_icon"
        android:visibility="gone"
        android:layout_width="4.0dp" android:layout_height="0.0dp"
        android:layout_marginTop="16.0dp" android:layout_marginBottom="16.0dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintVertical_bias="0.5" />
    <FrameLayout android:id="@id/menu_tip_view"
        android:layout_width="match_parent" android:layout_height="16.0dp"
        android:layout_marginLeft="8.0dp" android:layout_marginRight="8.0dp"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="parent">
        <TextView android:textSize="10.0dp" android:textStyle="bold" android:textColor="#ffffff"
            android:gravity="center" android:layout_gravity="right"
            android:id="@id/menu_tip_text" android:background="@drawable/menu_left_desc_bg"
            android:paddingLeft="6.0dp" android:paddingRight="6.0dp"
            android:layout_width="wrap_content" android:layout_height="match_parent"
            android:singleLine="true" />
        <ImageView android:layout_gravity="right" android:id="@id/menu_tip_image"
            android:layout_width="wrap_content" android:layout_height="match_parent"
            android:adjustViewBounds="true" />
    </FrameLayout>
    <ImageView android:id="@id/menu_icon" android:visibility="gone"
        android:layout_width="28.0dp" android:layout_height="28.0dp"
        android:layout_marginTop="16.0dp"
        app:layout_constraintBottom_toTopOf="@id/tv_menu_name"
        app:layout_constraintLeft_toLeftOf="@id/tv_menu_name"
        app:layout_constraintRight_toRightOf="@id/tv_menu_name"
        app:layout_constraintTop_toTopOf="parent" />
    <TextView android:textSize="12.0dp" android:textColor="#333333"
        android:ellipsize="end" android:gravity="center" android:id="@id/tv_menu_name"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginLeft="8.0dp" android:layout_marginRight="8.0dp"
        android:layout_marginBottom="16.0dp" android:maxLines="2"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintHorizontal_bias="0.0"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toBottomOf="@id/menu_icon"
        app:layout_goneMarginTop="16.0dp" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

## item_menu_product_header.xml (Category Header + Sub-tabs)

```xml
<androidx.constraintlayout.widget.ConstraintLayout android:id="@id/rl_commodity"
    android:padding="12.0dp"
    android:layout_width="match_parent" android:layout_height="wrap_content">
    <TextView android:textSize="18.0dp" android:textStyle="bold" android:textColor="#333333"
        android:ellipsize="end" android:id="@id/kind_name"
        android:layout_width="0.0dp" android:layout_height="wrap_content" android:maxLines="2"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="parent" />
    <com.luckin.client.us.menu.widget.NestedScrollableHost
        android:clipChildren="false"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layerType="software"
        app:layout_constraintTop_toBottomOf="@id/kind_name">
        <androidx.recyclerview.widget.RecyclerView android:id="@id/tow_kind_tabs"
            android:layout_width="match_parent" android:layout_height="wrap_content"
            android:layout_marginTop="8.0dp" />
    </com.luckin.client.us.menu.widget.NestedScrollableHost>
</androidx.constraintlayout.widget.ConstraintLayout>
```

## item_menu_product.xml (Standard Product Item)

```xml
<androidx.constraintlayout.widget.ConstraintLayout android:id="@id/rl_commodity"
    android:background="#ffffff"
    android:layout_width="match_parent" android:layout_height="wrap_content">
    <androidx.constraintlayout.widget.ConstraintLayout android:id="@id/clContent"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        app:layout_constraintLeft_toLeftOf="parent" app:layout_constraintTop_toTopOf="parent">
        <com.luckin.client.us.menu.widget.ProductImageView android:id="@id/product_image"
            android:layout_width="100.0dp" android:layout_height="100.0dp"
            android:layout_marginTop="8.0dp" android:layout_marginStart="12.0dp"
            app:layout_constraintLeft_toLeftOf="parent"
            app:layout_constraintTop_toTopOf="parent" />
        <ImageView android:id="@id/sell_up"
            android:layout_width="100.0dp" android:layout_height="100.0dp"
            android:src="@drawable/sell_icon"
            app:layout_constraintBottom_toBottomOf="@id/product_image"
            app:layout_constraintLeft_toLeftOf="@id/product_image"
            app:layout_constraintRight_toRightOf="@id/product_image"
            app:layout_constraintTop_toTopOf="@id/product_image" />
        <androidx.constraintlayout.widget.ConstraintLayout android:id="@id/name_layout"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginTop="12.0dp" android:layout_marginStart="8.0dp"
            android:layout_marginEnd="12.0dp"
            app:layout_constraintLeft_toRightOf="@id/product_image"
            app:layout_constraintRight_toRightOf="parent"
            app:layout_constraintTop_toTopOf="@id/product_image">
            <TextView android:textSize="16.0dp" android:textStyle="bold" android:textColor="#333333"
                android:ellipsize="end" android:id="@id/tv_product_name"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:maxLines="2"
                app:layout_constrainedWidth="true"
                app:layout_constraintHorizontal_bias="0.0"
                app:layout_constraintHorizontal_chainStyle="packed"
                app:layout_constraintLeft_toLeftOf="parent"
                app:layout_constraintRight_toLeftOf="@id/name_tag_layout"
                app:layout_constraintTop_toTopOf="parent"
                app:layout_constraintWidth_default="wrap" />
            <LinearLayout android:gravity="center" android:orientation="horizontal"
                android:id="@id/name_tag_layout"
                android:layout_width="wrap_content" android:layout_height="0.0dp"
                app:layout_constraintBottom_toBottomOf="@id/tv_product_name"
                app:layout_constraintLeft_toRightOf="@id/tv_product_name"
                app:layout_constraintRight_toRightOf="parent"
                app:layout_constraintTop_toTopOf="@id/tv_product_name" />
        </androidx.constraintlayout.widget.ConstraintLayout>
        <com.luckin.client.us.menu.widget.NestedScrollableHost android:id="@id/nshFlowTag"
            android:visibility="gone" android:clipChildren="false"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginTop="8.0dp" android:layerType="software"
            android:layout_marginEnd="12.0dp"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintStart_toStartOf="@id/name_layout"
            app:layout_constraintTop_toBottomOf="@id/name_layout">
            <com.luckin.client.us.menu.product.view.FlowTagRV android:id="@id/rvFlowTag"
                android:layout_width="match_parent" android:layout_height="wrap_content" />
        </com.luckin.client.us.menu.widget.NestedScrollableHost>
        <TextView android:textSize="12.0dp" android:textColor="#858585"
            android:ellipsize="end" android:id="@id/desc"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginTop="8.0dp" android:maxLines="2"
            android:layout_marginEnd="12.0dp"
            app:layout_constraintLeft_toLeftOf="@id/name_layout"
            app:layout_constraintRight_toRightOf="parent"
            app:layout_constraintTop_toBottomOf="@id/nshFlowTag" />
        <TextView android:textSize="20.0dp" android:textStyle="bold" android:textColor="#f95731"
            android:gravity="bottom" android:id="@id/discount_price"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:fontFamily="@font/din_condensed_bold"
            app:layout_constraintBottom_toTopOf="@id/discount_time_ll"
            app:layout_constraintLeft_toLeftOf="@id/name_layout"
            app:layout_constraintRight_toLeftOf="@id/price"
            app:layout_constraintTop_toBottomOf="@id/desc" />
        <TextView android:textSize="12.0dp" android:textStyle="bold" android:textColor="#c2c2c2"
            android:id="@id/price"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_marginLeft="2.0dp" android:includeFontPadding="false"
            android:fontFamily="@font/din_condensed_bold"
            app:layout_constraintBaseline_toBaselineOf="@id/discount_price"
            app:layout_constraintLeft_toRightOf="@id/discount_price" />
        <TextView android:textSize="10.0sp" android:textColor="#f95731"
            android:id="@id/discountPercent" android:background="@drawable/bg_discount_percent"
            android:paddingLeft="6.0dp" android:paddingTop="2.0dp"
            android:paddingRight="6.0dp" android:paddingBottom="2.0dp"
            android:visibility="gone"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_marginBottom="8.0dp" android:maxLines="1"
            android:textAllCaps="true" android:layout_marginStart="2.0dp"
            app:layout_constraintBottom_toBottomOf="@id/price"
            app:layout_constraintStart_toEndOf="@id/price"
            app:layout_constraintTop_toTopOf="@id/price" />
        <LinearLayout android:gravity="center_vertical" android:orientation="horizontal"
            android:id="@id/discount_time_ll" android:visibility="gone"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginTop="2.0dp" android:layout_marginEnd="12.0dp"
            app:layout_constraintEnd_toEndOf="@id/name_layout"
            app:layout_constraintStart_toStartOf="@id/name_layout"
            app:layout_constraintTop_toBottomOf="@id/discount_price">
            <ImageView android:id="@id/discount_time_icon" android:visibility="gone"
                android:layout_width="20.0dp" android:layout_height="20.0dp"
                android:layout_marginRight="2.0dp" />
            <TextView android:textSize="10.0sp" android:textColor="#f95731"
                android:ellipsize="end" android:id="@id/discount_time_countdown"
                android:visibility="gone"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:maxLines="2" />
        </LinearLayout>
        <ImageView android:id="@id/favourite" android:visibility="gone"
            android:layout_width="12.0dp" android:layout_height="12.0dp"
            android:layout_marginTop="2.0dp" android:src="@drawable/favourite"
            app:layout_constraintStart_toStartOf="@id/name_layout"
            app:layout_constraintTop_toBottomOf="@id/barrier_discount_bottom" />
    </androidx.constraintlayout.widget.ConstraintLayout>
    <View android:id="@id/line" android:background="#efefef"
        android:layout_width="match_parent" android:layout_height="1.0px"
        android:layout_marginLeft="12.0dp" android:layout_marginTop="12.0dp"
        android:layout_marginRight="12.0dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintTop_toBottomOf="@id/clContent" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

## item_menu_product_banner.xml

```xml
<androidx.constraintlayout.widget.ConstraintLayout android:id="@id/rl_commodity"
    android:background="@drawable/menu_banner_default"
    android:layout_width="match_parent" android:layout_height="wrap_content">
    <com.google.android.material.imageview.ShapeableImageView android:id="@id/kind_banner"
        android:layout_width="match_parent" android:layout_height="54.0dp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintLeft_toLeftOf="parent"
        app:layout_constraintRight_toRightOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_goneMarginTop="5.0dp"
        app:shapeAppearance="@style/SemicircleStyle" app:strokeWidth="0.0dp" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

## item_menu_product_recommend_item.xml (Recommendation Card)

```xml
<androidx.cardview.widget.CardView android:descendantFocusability="blocksDescendants"
    android:layout_width="170.0dp" android:layout_height="wrap_content"
    app:cardBackgroundColor="#ffffff" app:cardCornerRadius="12.0dp" app:cardElevation="0.0px">
    <androidx.constraintlayout.widget.ConstraintLayout
        android:paddingBottom="12.0dp"
        android:layout_width="match_parent" android:layout_height="match_parent"
        android:layout_marginLeft="12.0dp" android:layout_marginRight="12.0dp">
        <com.luckin.client.us.menu.widget.ProductImageView android:id="@id/product_image"
            android:layout_width="100.0dp" android:layout_height="100.0dp"
            android:layout_marginTop="8.0dp"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toTopOf="parent" />
        <ImageView android:id="@id/sell_up"
            android:layout_width="100.0dp" android:layout_height="100.0dp"
            android:src="@drawable/sell_icon"
            app:layout_constraintBottom_toBottomOf="@id/product_image"
            app:layout_constraintEnd_toEndOf="@id/product_image"
            app:layout_constraintStart_toStartOf="@id/product_image"
            app:layout_constraintTop_toTopOf="@id/product_image" />
        <TextView android:textSize="16.0dp" android:textStyle="bold" android:textColor="#333333"
            android:ellipsize="end" android:id="@id/tvProductName"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginTop="8.0dp" android:maxLines="1"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toBottomOf="@id/product_image" />
        <TextView android:textSize="20.0dp" android:textStyle="bold" android:textColor="#f95731"
            android:gravity="bottom" android:id="@id/discountPrice"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_marginTop="4.0dp" android:fontFamily="@font/din_condensed_bold"
            app:layout_constraintEnd_toStartOf="@id/price"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintTop_toBottomOf="@id/tvProductName" />
        <TextView android:textSize="14.0dp" android:textStyle="bold" android:textColor="#c2c2c2"
            android:id="@id/price"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_marginLeft="3.0dp" android:includeFontPadding="false"
            android:fontFamily="@font/din_condensed_bold"
            app:layout_constraintBaseline_toBaselineOf="@id/discountPrice"
            app:layout_constraintStart_toEndOf="@id/discountPrice" />
        <ImageView android:id="@id/favourite" android:visibility="gone"
            android:layout_width="12.0dp" android:layout_height="12.0dp"
            android:src="@drawable/favourite"
            app:layout_constraintBottom_toBottomOf="@id/discountPrice"
            app:layout_constraintEnd_toEndOf="parent"
            app:layout_constraintTop_toTopOf="@id/discountPrice" />
    </androidx.constraintlayout.widget.ConstraintLayout>
</androidx.cardview.widget.CardView>
```

## item_menu_product_tow_kind_tab.xml (Sub-category Pill)

```xml
<CheckedTextView android:textSize="12.0dp"
    android:textColor="@color/menu_two_kind_tab_text"
    android:gravity="center"
    android:background="@drawable/menu_two_kind_tab"
    android:paddingLeft="8.0dp" android:paddingRight="8.0dp"
    android:layout_width="wrap_content" android:layout_height="20.0dp"
    android:layout_marginRight="8.0dp" android:maxLines="1" />
```

## fragment_cart.xml

```xml
<RelativeLayout android:layout_width="match_parent" android:layout_height="match_parent">
    <com.google.android.material.card.MaterialCardView android:id="@id/empty_cart_view"
        android:layout_width="56.0dp" android:layout_height="56.0dp"
        android:layout_marginBottom="20.0dp"
        android:layout_alignParentRight="true" android:layout_alignParentBottom="true"
        android:layout_marginEnd="16.0dp"
        app:cardBackgroundColor="@android:color/white"
        app:cardCornerRadius="50.0dp" app:cardElevation="8.0dp"
        app:strokeColor="@android:color/transparent" app:strokeWidth="0.0dp">
        <ImageView android:layout_gravity="center"
            android:layout_width="match_parent" android:layout_height="match_parent"
            android:src="@drawable/cart_icon" />
    </com.google.android.material.card.MaterialCardView>
    <androidx.constraintlayout.widget.ConstraintLayout android:id="@id/gift_container"
        android:visibility="gone"
        android:layout_width="match_parent" android:layout_height="127.0dp"
        android:layout_marginBottom="20.0dp" android:layout_alignParentBottom="true">
        <View android:id="@id/gift_bg" android:background="@drawable/gift_bg"
            android:layout_width="match_parent" android:layout_height="90.0dp"
            android:layout_marginLeft="16.0dp" android:layout_marginRight="16.0dp"
            app:layout_constraintBottom_toBottomOf="parent" />
        <LinearLayout android:id="@id/tv_promotion_desc_group"
            android:layout_width="0.0dp" android:layout_height="wrap_content"
            android:layout_marginLeft="20.0dp" android:layout_marginTop="8.0dp"
            app:layout_constraintLeft_toLeftOf="@id/gift_bg"
            app:layout_constraintRight_toLeftOf="@id/img_gift"
            app:layout_constraintTop_toTopOf="@id/gift_bg">
            <TextView android:textSize="12.0dp" android:textColor="#333333"
                android:ellipsize="end" android:gravity="center" android:layout_gravity="center"
                android:id="@id/tv_promotion_desc"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:singleLine="true" android:drawablePadding="4.0dp" />
        </LinearLayout>
        <FrameLayout android:id="@id/img_gift" android:focusable="true"
            android:visibility="invisible" android:clickable="true"
            android:layout_width="58.0dp" android:layout_height="58.0dp"
            android:layout_marginEnd="20.0dp"
            app:layout_constraintLeft_toRightOf="@id/tv_promotion_desc_group"
            app:layout_constraintRight_toRightOf="@id/gift_bg"
            app:layout_constraintTop_toTopOf="parent">
            <ImageView android:layout_gravity="center|bottom" android:id="@id/img_gift_background"
                android:layout_width="48.0dp" android:layout_height="48.0dp" />
            <ImageView android:id="@id/img_gift_picture"
                android:layout_width="match_parent" android:layout_height="match_parent" />
        </FrameLayout>
        <LinearLayout android:id="@id/btn_git_select_container"
            android:visibility="invisible"
            android:layout_width="wrap_content" android:layout_height="match_parent"
            android:layout_marginTop="34.0dp" android:layout_marginEnd="15.0dp"
            app:layout_constraintLeft_toRightOf="@id/tv_promotion_desc_group"
            app:layout_constraintRight_toRightOf="@id/gift_bg"
            app:layout_constraintTop_toTopOf="parent">
            <TextView android:textSize="12.0sp" android:textStyle="bold" android:textColor="#0022ab"
                android:gravity="center" android:id="@id/btn_git_select"
                android:background="@drawable/cart_select_bg"
                android:paddingLeft="14.0dp" android:paddingTop="3.0dp"
                android:paddingRight="14.0dp" android:paddingBottom="3.0dp"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:layout_marginTop="10.0dp" />
        </LinearLayout>
    </androidx.constraintlayout.widget.ConstraintLayout>
    <FrameLayout android:id="@id/fl_cart_view" android:visibility="gone"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginBottom="20.0dp" android:layout_alignParentBottom="true">
        <LinearLayout android:gravity="center_vertical" android:layout_gravity="bottom"
            android:orientation="horizontal" android:id="@id/ll_cart_container"
            android:background="@drawable/cart_item_bg"
            android:paddingLeft="52.0dp"
            android:layout_width="match_parent" android:layout_height="55.0dp"
            android:layout_marginLeft="16.0dp" android:layout_marginRight="16.0dp"
            android:minHeight="55.0dp" android:paddingEnd="20.0dp">
            <TextView android:textSize="24.0sp" android:textColor="#ffffff"
                android:id="@id/cart_price_discount"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:fontFamily="@font/din_condensed_bold"
                android:layout_marginStart="14.0dp" />
            <TextView android:textSize="14.0sp" android:textColor="#80ffffff"
                android:id="@id/cart_price"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:layout_marginTop="3.0dp" android:fontFamily="@font/din_condensed_bold"
                android:layout_marginStart="4.0dp" />
            <TextView android:textSize="10.0sp" android:textColor="#f95731"
                android:gravity="center" android:id="@id/rate"
                android:background="@drawable/rate_text_bg"
                android:paddingLeft="6.0dp" android:paddingRight="6.0dp"
                android:layout_width="wrap_content" android:layout_height="16.0dp"
                android:layout_marginStart="4.0dp" />
            <TextView android:textSize="17.0sp" android:textStyle="bold" android:textColor="#fff"
                android:gravity="end|center"
                android:layout_width="0.0dp" android:layout_height="match_parent"
                android:text="Checkout" android:layout_weight="1.0" />
        </LinearLayout>
        <FrameLayout android:layout_width="wrap_content" android:layout_height="wrap_content">
            <com.airbnb.lottie.LottieAnimationView android:id="@id/lottie_cart"
                android:layout_width="86.0dp" android:layout_height="108.0dp"
                android:layout_marginBottom="5.0dp" android:layout_marginStart="8.0dp"
                app:lottie_autoPlay="false" app:lottie_loop="false"
                app:lottie_progress="1.0" app:lottie_rawRes="@raw/lottie_shopping_bag"
                app:lottie_speed="0.8" />
            <TextView android:textSize="12.0sp" android:textStyle="bold" android:textColor="#0022ab"
                android:gravity="center" android:layout_gravity="end|bottom"
                android:id="@id/cart_badge" android:background="@drawable/cart_badge_bg"
                android:paddingLeft="2.5dp" android:paddingRight="2.5dp"
                android:layout_width="wrap_content" android:layout_height="16.0dp"
                android:layout_marginBottom="32.0dp" android:minWidth="16.0dp"
                android:fontFamily="@font/din_condensed_bold"
                android:layout_marginEnd="22.0dp" />
        </FrameLayout>
    </FrameLayout>
</RelativeLayout>
```

---

# DRAWABLES

## menu_index_icon.xml (Active Category Indicator)

```xml
<shape android:shape="rectangle">
    <corners android:topLeftRadius="0.0dp" android:topRightRadius="4.0dp"
        android:bottomLeftRadius="0.0dp" android:bottomRightRadius="4.0dp" />
    <solid android:color="#0a2db8" />
</shape>
```

## menu_item_bg.xml (Category Item Background Selector)

```xml
<selector>
    <item android:state_selected="true" android:drawable="@drawable/menu_item_check_bg" />
    <item android:state_selected="false" android:drawable="@drawable/menu_item_check_tran_bg" />
</selector>
```

## menu_item_check_bg.xml (Selected Category Background)

```xml
<shape>
    <gradient android:startColor="#33a1a1a1" android:endColor="#33f2f2f2" android:angle="0.0" />
</shape>
```

## menu_item_check_tran_bg.xml (Unselected Category Background)

```xml
<shape>
    <gradient android:startColor="#00000000" android:endColor="#00000000" android:angle="0.0" />
</shape>
```

## menu_two_kind_tab.xml (Sub-tab Pill Selector)

```xml
<selector>
    <item android:state_checked="true">
        <shape>
            <solid android:color="#f5f8fe" />
            <corners android:radius="30.0dp" />
        </shape>
    </item>
    <item android:state_selected="true">
        <shape>
            <solid android:color="#f5f8fe" />
            <corners android:radius="30.0dp" />
        </shape>
    </item>
    <item>
        <shape>
            <solid android:color="#efefef" />
            <corners android:radius="30.0dp" />
        </shape>
    </item>
</selector>
```

## cart_item_bg.xml (Cart Bar Background)

```xml
<shape android:shape="rectangle">
    <corners android:radius="30.0dp" />
    <solid android:color="#0a2db8" />
</shape>
```

## cart_badge_bg.xml (Cart Badge Background)

```xml
<shape android:shape="rectangle">
    <solid android:color="#ffffff" />
    <corners android:radius="8.0dp" />
</shape>
```

## cart_bg.xml (Cart Container Background)

```xml
<shape android:shape="rectangle">
    <corners android:radius="30.0dp" />
    <solid android:color="#dee9ff" />
</shape>
```

## cart_select_bg.xml (Gift Select Button Border)

```xml
<shape android:shape="rectangle">
    <corners android:radius="10.0dp" />
    <stroke android:width="1.0dp" android:color="#0022ab" />
</shape>
```

## bg_search.xml (Search Button Background)

```xml
<shape android:shape="rectangle">
    <corners android:radius="100.0dp" />
    <solid android:color="#f5f8fe" />
</shape>
```

## product_image_oval.xml (Product Image Placeholder)

```xml
<shape android:shape="oval" android:useLevel="false">
    <solid android:color="#f8f1da" />
</shape>
```

## menu_banner_default.xml (Banner Placeholder)

```xml
<shape android:shape="rectangle">
    <corners android:topLeftRadius="12.0dp" android:topRightRadius="12.0dp"
        android:bottomLeftRadius="0.0dp" android:bottomRightRadius="0.0dp" />
    <solid android:color="#e4e4e4" />
</shape>
```

## menu_round_top_left_right.xml (Section Top Rounding)

```xml
<shape android:shape="rectangle">
    <corners android:topLeftRadius="12.0dp" android:topRightRadius="12.0dp"
        android:bottomLeftRadius="0.0dp" android:bottomRightRadius="0.0dp" />
    <solid android:color="#ffffff" />
</shape>
```

## menu_round_bottom_left_right.xml (Section Bottom Rounding)

```xml
<shape android:shape="rectangle">
    <corners android:topLeftRadius="0.0dp" android:topRightRadius="0.0dp"
        android:bottomLeftRadius="12.0dp" android:bottomRightRadius="12.0dp" />
    <solid android:color="#ffffff" />
</shape>
```

## platform_tab_shape_red_dot_small.xml (Notification Dot)

Red circular dot for tab badge notifications.

---

# JAVA SOURCE CODE

## ProductMenuFragment.java (Scroll Sync Logic)

**File:** `sources/com/luckin/client/us/menu/product/ProductMenuFragment.java`
**Compiled from:** `ProductMenuFragment.kt`

```java
// Inner class c: RecyclerView.OnScrollListener — the heart of scroll sync
public static final class c extends RecyclerView.t {
    @Override
    public void onScrolled(@NotNull RecyclerView recyclerView, int dx, int dy) {
        super.onScrolled(recyclerView, dx, dy);
        RecyclerView.o layoutManager = recyclerView.getLayoutManager();
        if (layoutManager instanceof LinearLayoutManager) {
            LinearLayoutManager linearLayoutManager = (LinearLayoutManager) layoutManager;
            ProductMenuFragment.this.R(linearLayoutManager);     // sync category sidebar
            ProductMenuFragment.this.S(linearLayoutManager, recyclerView); // update sticky header visibility
            ProductMenuFragment.this.T(linearLayoutManager, recyclerView); // update sticky header sub-tab
        }
    }
}

// Inner class b: Category sidebar click listener
public static final class b implements l.a {
    @Override
    public void a(int position, @NotNull ProductListModel bean) {
        ProductMenuFragment.this.I(position); // scroll products to category
    }
}

// Inner class a: Product item click → opens product detail via router
public static final class a implements ProductAdapter.e {
    @Override
    public void b(int position) {
        // Sub-tab click handler: scroll rv_goods with sticky header offset
        RecyclerView.o layoutManager = binding.rvGoods.getLayoutManager();
        ((LinearLayoutManager) layoutManager)
            .scrollToPositionWithOffset(position, binding.stickyHeader.getHeight() - 1);
    }
}
```

### Method R: Scroll → Sync Category Sidebar

```java
// Called on every scroll event — syncs left category list with scroll position
private final void R(LinearLayoutManager layoutManager) {
    int firstVisiblePosition = layoutManager.findFirstVisibleItemPosition();
    // productAdapter.a() maps product position → category index
    int categoryIndex = productAdapter.a(firstVisiblePosition);
    // Update category sidebar selection
    menuAdapter.e(categoryIndex);
    // Smooth scroll category into view
    binding.rvMenu.smoothScrollToPosition(categoryIndex);
}
```

### Method S: Update Sticky Header Visibility & Content

```java
// Called on scroll — manages sticky header show/hide and content
// (Decompiled as raw bytecode due to complexity, key logic:)
// 1. Gets first visible position from LinearLayoutManager
// 2. Gets Product at that position from ProductAdapter
// 3. Calls O(product) to refresh sticky header content
```

### Method T: Update Sticky Header Sub-Tab Selection

```java
// Called on scroll — finds which sub-tab should be selected
private final void T(LinearLayoutManager layoutManager, RecyclerView recyclerView) {
    int height = binding.stickyHeader.getHeight();
    int childCount = binding.rvGoods.getChildCount();
    View targetChild = null;

    // Find the child view that straddles the sticky header bottom edge
    for (int i = 0; i < childCount; i++) {
        View child = recyclerView.getChildAt(i);
        if (child.getTop() <= height && height <= child.getBottom()) {
            targetChild = child;
            break;
        }
    }
    if (targetChild == null) return;

    int position = layoutManager.getPosition(targetChild);
    // Update sub-tab selection based on product's two-level index
    binding.stickyHeader.setChecked(productAdapter.b(position).getTwoProductIndex());
}
```

### Method O: Refresh Sticky Header Data

```java
// Binds header data to the sticky ProductHeaderLayout
private final void O(Product curHeaderBean) {
    if (curHeaderBean == null) {
        binding.stickyHeader.setVisibility(GONE);
        return;
    }
    if (this.lastHeader == curHeaderBean) return; // no change
    this.lastHeader = curHeaderBean;

    if (curHeaderBean.getItemViewType() == -1) {
        // Banner type — hide sticky header (set to INVISIBLE with 1px height)
        binding.stickyHeader.setVisibility(INVISIBLE);
        layoutParams.height = 1;
    } else {
        layoutParams.height = WRAP_CONTENT;
        HeaderProductBean headerBean = curHeaderBean.getHeaderProductBean();
        if (headerBean != null) {
            // Bind category name + sub-tabs, with click handler
            binding.stickyHeader.d(headerBean, true, (TwoLevelMenu twoLevelMenu) -> {
                if (twoLevelMenu != null) {
                    // Sub-tab click → scroll to that sub-category position
                    linearLayoutManager.scrollToPositionWithOffset(
                        twoLevelMenu.getProductPosition(),
                        binding.stickyHeader.getHeight() - 1
                    );
                }
            });
        }
    }
}
```

### Method I: Category Tap → Scroll Products

```java
// Called when user taps a category in the left sidebar
public final void I(final int position) {
    if (position < 0) return;

    // 1. Smooth scroll category list to show selected category
    binding.rvMenu.smoothScrollToPosition(position);

    // 2. Get the product list start position for this category
    int rightPosition = menuAdapter.b(position).getRightPosition();

    // 3. Scroll products to that position
    ((LinearLayoutManager) binding.rvGoods.getLayoutManager())
        .scrollToPositionWithOffset(rightPosition, 0);

    // 4. Delayed (50ms) update of category selection state
    binding.rvMenu.postDelayed(() -> {
        menuAdapter.e(position); // highlight selected category
    }, 50L);
}
```

### Method U: Product-Level Scroll (with 50ms delayed corrections)

```java
// Scrolls to a specific product position with multi-step correction
private final void U(final int position) {
    if (position < 0 || binding.rvGoods.getAdapter() == null) return;
    if (position >= productAdapter.getItemCount()) return;

    // Check if product has stock
    ProductBean product = productAdapter.b(position).getProduct();
    if ((product != null ? product.getMaxAmount() : 0) <= 0) {
        Z(); // reset to top
        return;
    }

    int categoryIndex = productAdapter.a(position);

    // Step 1: Initial scroll to position
    linearLayoutManager.scrollToPositionWithOffset(position, 0);

    // Step 2: After 50ms, adjust scroll to account for sticky header height
    binding.getRoot().postDelayed(() -> {
        binding.stickyHeader.post(() -> {
            linearLayoutManager.scrollToPositionWithOffset(
                position,
                binding.stickyHeader.getHeight() + 2  // offset by header + 2px
            );
        });
    }, 50L);

    // Step 3: After 50ms, sync category sidebar
    binding.rvMenu.smoothScrollToPosition(categoryIndex);
    binding.rvMenu.postDelayed(() -> {
        menuAdapter.e(position); // highlight category
    }, 50L);

    // Step 4: After 50ms, update sticky header
    binding.rvGoods.postDelayed(() -> {
        S(layoutManager, recyclerView); // refresh sticky header
        T(layoutManager, recyclerView); // refresh sub-tab selection
    }, 50L);
}
```

### Method m: Fragment Setup (onContentViewReady)

```java
public void m(@Nullable Bundle savedInstanceState) {
    // Create adapters
    this.productAdapter = new ProductAdapter(new a(new MenuPricePromptView(requireContext())));
    this.menuAdapter = new l(new b()); // b = category click listener

    // Setup left category list
    binding.rvMenu.setLayoutManager(new LinearLayoutManager(getContext()));
    binding.rvMenu.setAdapter(menuAdapter);

    // Setup right product list
    binding.rvGoods.setLayoutManager(new LinearLayoutManager(getContext()));
    binding.rvGoods.setAdapter(productAdapter);

    // Disable ALL item animations on category list (instant updates)
    binding.rvMenu.getItemAnimator().setAddDuration(0L);
    binding.rvMenu.getItemAnimator().setChangeDuration(0L);
    binding.rvMenu.getItemAnimator().setMoveDuration(0L);
    binding.rvMenu.getItemAnimator().setRemoveDuration(0L);
    ((SimpleItemAnimator) binding.rvMenu.getItemAnimator()).setSupportsChangeAnimations(false);

    // Register scroll listener for bidirectional sync
    binding.rvGoods.addOnScrollListener(new c());

    // Observe ViewModel LiveData
    K(); // sets up productMenu + productList + timerTick observers
}
```

---

## ProductHeaderLayout.java (Sticky Header)

**File:** `sources/com/luckin/client/us/menu/product/view/ProductHeaderLayout.java`
**Compiled from:** `ProductHeaderLayout.kt`

```java
public final class ProductHeaderLayout extends FrameLayout {
    private HeaderProductBean headerBean;
    private ItemMenuProductHeaderBinding binding;
    private final a adapter; // inner tab adapter

    public ProductHeaderLayout(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        binding = ItemMenuProductHeaderBinding.inflate(LayoutInflater.from(context), this, true);
        adapter = new a();

        // Horizontal LinearLayoutManager for sub-tabs
        binding.towKindTabs.setLayoutManager(new LinearLayoutManager(context, HORIZONTAL, false));
        binding.towKindTabs.setAdapter(adapter);

        // Disable ALL animations for instant tab switching
        binding.towKindTabs.getItemAnimator().setAddDuration(0L);
        binding.towKindTabs.getItemAnimator().setChangeDuration(0L);
        binding.towKindTabs.getItemAnimator().setMoveDuration(0L);
        binding.towKindTabs.getItemAnimator().setRemoveDuration(0L);
        ((SimpleItemAnimator) binding.towKindTabs.getItemAnimator())
            .setSupportsChangeAnimations(false);
    }

    // Bind header data: category name + sub-tabs
    public final void d(HeaderProductBean headerBean, boolean isStickerHeader,
                        Function1<TwoLevelMenu, Unit> onTabClick) {
        this.headerBean = headerBean;
        binding.kindName.setText(headerBean.getKindName());

        // Filter out placeholder tabs (twoKindId == "-1")
        List<TwoLevelMenu> filtered = headerBean.getTwoProductList().stream()
            .filter(tab -> !"-1".equals(tab.getTwoKindId()))
            .collect(toList());
        headerBean.setTwoProductList(filtered);

        // Show tabs only if > 1 sub-category
        if (filtered != null && filtered.size() > 1) {
            adapter.f(filtered);  // set tab data
            binding.towKindTabs.setVisibility(VISIBLE);
        } else {
            binding.towKindTabs.setVisibility(GONE);
        }

        // Set background based on banner context
        if (headerBean.getForwardHasBanner() && !isStickerHeader) {
            binding.getRoot().setBackgroundColor(0xFFFFFFFF); // white
        } else {
            binding.getRoot().setBackgroundResource(R.drawable.menu_round_top_left_right);
        }

        adapter.g(onTabClick); // register tab click callback
    }

    // Update selected sub-tab position
    public final void setChecked(int position) {
        if (headerBean == null || headerBean.getTwoProductList() == null) return;
        if (position > headerBean.getTwoProductList().size() || position < 0) return;
        adapter.e(position);  // highlight tab
        binding.towKindTabs.smoothScrollToPosition(position); // scroll into view
    }

    // Inner adapter for sub-category tabs (CheckedTextView pills)
    public static final class a extends RecyclerView.Adapter<C0240a> {
        private List<TwoLevelMenu> tabList;
        private int checkedPosition;
        private Function1<TwoLevelMenu, Unit> onTabClick;

        @Override
        public void onBindViewHolder(C0240a holder, int position) {
            holder.viewBinding.getRoot().setSelected(checkedPosition == position);
            holder.viewBinding.getRoot().setText(tabList.get(position).getTwoKindName());
            holder.viewBinding.getRoot().setOnClickListener(v -> {
                if (onTabClick != null) onTabClick.invoke(tabList.get(position));
            });
        }

        public void e(int position) {
            if (position == checkedPosition) return;
            int old = checkedPosition;
            checkedPosition = position;
            notifyItemChanged(old);
            notifyItemChanged(checkedPosition);
        }

        public void f(List<TwoLevelMenu> tabList) {
            this.tabList = tabList;
            notifyDataSetChanged();
        }
    }
}
```

---

## l.java / ProductMenuAdapter (Category Sidebar Adapter)

**File:** `sources/com/luckin/client/us/menu/product/l.java`
**Compiled from:** `ProductMenuAdapter.kt`

```java
public final class l extends RecyclerView.Adapter<RecyclerView.c0> {
    private final a menuClickListener;
    private ArrayList<ProductListModel> mMenuBeans = new ArrayList<>();
    private int currentCheckPosition;

    // Click interface
    public interface a {
        void a(int position, ProductListModel bean);
    }

    public l(a menuClickListener) {
        this.menuClickListener = menuClickListener;
    }

    @Override
    public void onBindViewHolder(RecyclerView.c0 holder, final int position) {
        if (holder instanceof b) {
            ProductListModel bean = mMenuBeans.get(position);

            // Show/hide category icon (28x28dp)
            if (bean.getIcon() == null || bean.getIcon().isEmpty()) {
                holder.viewBinding.menuIcon.setVisibility(GONE);
                holder.viewBinding.getRoot().getLayoutParams().height = dp(60);
            } else {
                holder.viewBinding.menuIcon.setVisibility(VISIBLE);
                holder.viewBinding.getRoot().getLayoutParams().height = dp(86);
                loadImage(holder.viewBinding.menuIcon, bean.getIcon());
            }

            // Category badge/tag (OneTagInfo)
            if (bean.getOneTagInfo() != null) {
                int type = bean.getOneTagInfo().getType();
                if (type == 1) {
                    // Image tag
                    holder.viewBinding.menuTipImage.setVisibility(VISIBLE);
                    loadImage(holder.viewBinding.menuTipImage, bean.getOneTagInfo().getImageUrl());
                } else if (type == 2) {
                    // Text tag with dynamic bg color
                    holder.viewBinding.menuTipText.setText(bean.getOneTagInfo().getName());
                    holder.viewBinding.menuTipText.getBackground()
                        .setTint(parseColor(bean.getOneTagInfo().getBgColor(), "#0A2DB8"));
                    holder.viewBinding.menuTipText
                        .setTextColor(parseColor(bean.getOneTagInfo().getNameColor(), "#FFFFFF"));
                }
            }

            // Selected vs unselected state
            if (position == currentCheckPosition) {
                holder.viewBinding.index.setVisibility(VISIBLE);  // blue indicator bar
                holder.viewBinding.getRoot().setSelected(true);   // gradient background
                holder.viewBinding.tvMenuName.setTextColor(Color.parseColor("#333333"));
                holder.viewBinding.tvMenuName.setTypeface(
                    Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD));
            } else {
                holder.viewBinding.index.setVisibility(GONE);
                holder.viewBinding.getRoot().setSelected(false);  // transparent
                holder.viewBinding.tvMenuName.setTextColor(Color.parseColor("#333333"));
                holder.viewBinding.tvMenuName.setTypeface(
                    Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL));
            }

            holder.viewBinding.tvMenuName.setText(bean.getKindName());
            holder.viewBinding.getRoot().setOnClickListener(v -> {
                menuClickListener.a(position, bean);
            });
        }
    }

    // Update selection with animated change
    public final void e(int position) {
        if (position == currentCheckPosition || position < 0 || position >= mMenuBeans.size())
            return;
        int old = currentCheckPosition;
        currentCheckPosition = position;
        notifyItemChanged(old);
        notifyItemChanged(currentCheckPosition);
    }

    // Last item is a spacer (viewType 666)
    @Override
    public int getItemViewType(int position) {
        return position == getItemCount() - 1 ? 666 : super.getItemViewType(position);
    }

    @Override
    public int getItemCount() { return mMenuBeans.size() + 1; }
}
```

---

## NestedScrollableHost.java (ViewPager2 Scroll Conflict Resolver)

**File:** `sources/com/luckin/client/us/menu/widget/NestedScrollableHost.java`
**Compiled from:** `NestedScrollableHost.kt`

```java
public final class NestedScrollableHost extends FrameLayout {
    private int touchSlop;
    private float initialX;
    private float initialY;

    public NestedScrollableHost(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
    }

    // Check if child can scroll in the given direction
    private boolean canChildScroll(int orientation, float delta) {
        int direction = -((int) Math.signum(delta));
        View child = getChildCount() > 0 ? getChildAt(0) : null;
        if (child == null) return false;
        return orientation == 0
            ? child.canScrollHorizontally(direction)
            : child.canScrollVertically(direction);
    }

    // Intercept touch events to prevent ViewPager2 from stealing horizontal scroll
    private void handleInterceptTouchEvent(MotionEvent e) {
        ViewPager2 parentViewPager = getParentViewPager();
        if (parentViewPager == null) return;

        int orientation = parentViewPager.getOrientation();
        if (!canChildScroll(orientation, -1.0f) && !canChildScroll(orientation, 1.0f)) return;

        if (e.getAction() == MotionEvent.ACTION_DOWN) {
            initialX = e.getX();
            initialY = e.getY();
            getParent().requestDisallowInterceptTouchEvent(true);
        } else if (e.getAction() == MotionEvent.ACTION_MOVE) {
            float dx = e.getX() - initialX;
            float dy = e.getY() - initialY;
            boolean isHorizontal = orientation == 0;

            // Apply 0.5x scaling to the cross-axis for bias detection
            float scaledDx = Math.abs(dx) * (isHorizontal ? 0.5f : 1.0f);
            float scaledDy = Math.abs(dy) * (isHorizontal ? 1.0f : 0.5f);

            if (scaledDx > touchSlop || scaledDy > touchSlop) {
                if (isHorizontal == (scaledDy > scaledDx)) {
                    // Cross-axis scroll — let parent handle
                    getParent().requestDisallowInterceptTouchEvent(false);
                } else {
                    // Same-axis — check if child can still scroll
                    float mainDelta = isHorizontal ? dx : dy;
                    getParent().requestDisallowInterceptTouchEvent(
                        canChildScroll(orientation, mainDelta));
                }
            }
        }
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent e) {
        handleInterceptTouchEvent(e);
        return super.onInterceptTouchEvent(e);
    }

    // Walk up view hierarchy to find parent ViewPager2
    private ViewPager2 getParentViewPager() {
        View v = (getParent() instanceof View) ? (View) getParent() : null;
        while (v != null && !(v instanceof ViewPager2)) {
            v = (v.getParent() instanceof View) ? (View) v.getParent() : null;
        }
        return (v instanceof ViewPager2) ? (ViewPager2) v : null;
    }
}
```
